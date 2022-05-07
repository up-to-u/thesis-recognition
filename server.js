const express = require("express");
const path = require("path");
const { get } = require("request");
const mysql = require("mysql");
const dotenv = require('dotenv');
const fs = require('fs');
const http = require('http');
const https = require('https');
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const User = require("./models/user");
const moment = require('moment');
const faceapi = require("face-api.js");
const canvas = require("canvas");
//const axios = require('axios');
const Attendance = require("./models/attendance");

dotenv.config({ path: './.env' });

// Inject node-canvas to the faceapi lib
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });


const app = express();

/* const privateKey  = fs.readFileSync(process.env.PRIVATE_KEY_PEM, 'utf8');
const certificate = fs.readFileSync(process.env.CERTIFICATE_PEM, 'utf8');

const credentials = {key: privateKey, cert: certificate}; */

const MONGO_DB_URL = "mongodb://localhost/attendance";

let trainingDir = './faces';

// Connect to MongoDB Atlas
mongoose
    .connect(MONGO_DB_URL, { useNewUrlParser: true })
    .then(result => {

        // Listen on port 1000
        const port = process.env.PORT || 1000;
        app.listen(port, () =>
            console.log("Express app listening on port " + port)
        );

        //init();

        const httpServer = http.createServer(app);
        //const httpsServer = https.createServer(credentials, app);

        /*     httpServer.listen(port, () =>
              console.log("Express app listening on http port " + port)
            ); */
        //httpsServer.listen(8444);

    })
    .catch(err => {
        console.log("Not connected to db: " + err);
    });

var db = mongoose.connection;

// Handle mongo error checking
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
    console.log("we are connected!");
});
/*
var users = [];

const con = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE,
  port: process.env.DATABASE_PORT,
  multipleStatements: true
});

 con.connect( (error) => {
  if(error) {
    console.log(error)
  } else {
    console.log("MySQL Connected...")
  }
})

con.query('SELECT * FROM students', (err,rows) => {
  if(err) throw err;

  rows.forEach( (row) => {
    names = `${row.stdn_roll}`;
    users.push(names);
  });

  console.log(users);

}); */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use sessions for tracking logins
app.use(
    session({
        secret: "simplifyjs rocks!",
        resave: false,
        saveUninitialized: false,
        store: new MongoStore({
            mongooseConnection: db
        })
    })
);

// Session isLogin
app.use((req, res, next) => {
    res.locals.isLogin = req.session.userId != undefined;
    res.locals.isTeacher = (req.session.userType === 'Teacher') ? true : false;
    res.locals.isStudent = (req.session.userType === 'Student') ? true : false;

    //console.log(req.session);
    /*   res.locals.userFirstname = req.session.userFirstname;
      res.locals.userLastname = req.session.userLastname;
      res.locals.userEmail = req.session.userEmail;
      res.locals.userUsername = req.session.userUsername;
      res.locals.userType = req.session.userType; */
    //console.log('teacher',res.locals.isTeacher);
    //console.log('student',res.locals.isStudent);

    next();
});

// Middleware for Flash
app.use(flash());

const viewsDir = path.join(__dirname, "views");
app.use(express.static(viewsDir));
app.use(express.static(path.join(__dirname, "./public")));
app.use(express.static(path.join(__dirname, "./images")));
app.use(express.static(path.join(__dirname, "./weights")));
app.use(express.static(path.join(__dirname, "./attendance")));
app.use(express.static(path.join(__dirname, "./faces")));
app.use(express.static(path.join(__dirname, "./out")));
app.use(express.static(path.join(__dirname, "./requestattendance")));
app.use(express.static(path.join(__dirname, "./out")));
app.use(express.static(path.join(__dirname, "./dist")));
app.set("view engine", "ejs");


// User session
app.use((req, res, next) => {
    if (!req.session.userId) {
        return next();
    }
    User.findById(req.session.userId)
        .then(user => {
            if (!user) {
                return next();
            }
            req.user = user;
            next();
        })
        .catch(err => {
            next(err);
        });
})

const multer = require('multer');
var i = 1;
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = "./images/" + req.session.userId
        fs.exists(dir, exist => {
            if (!exist) {
                return fs.mkdir(dir, error => cb(error, dir))
            }
            return cb(null, dir)
        })
    },
    filename: function (req, file, cb) {

        let fpath = "./images/" + req.session.userId + "/" + req.session.userId + i + ".jpg";
        if (fs.existsSync(fpath)) {
            fs.unlink(fpath, function (err) {
                if (err) throw err;
                // if no error, file has been deleted successfully
                console.log('File deleted!');
            });
        }

        cb(null, req.session.userId + i + ".jpg")
        //cb(null, req.session.userId + path.extname(file.originalname))
        i++;
    }
})
const fileFilter = (req, file, cb) => {
    if (file.mimetype == 'image/jpeg' || file.mimetype == 'image/png') {
        cb(null, true);
    } else {
        cb(null, false);
    }
}

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image")) {
        cb(null, true);
    } else {
        cb("Please upload only images.", false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter
});

app.post("/upload-profile-pic", upload.array("profile_pic", 5), async (req, res, next) => {
    try {
        // Load required models
        await faceapi.nets.ssdMobilenetv1.loadFromDisk('weights');
        await faceapi.nets.faceLandmark68Net.loadFromDisk('weights');
        await faceapi.nets.faceRecognitionNet.loadFromDisk('weights');
        const dir = "./images/" + req.session.userId
        let files = fs.readdirSync(dir);

        //console.log(files);
        files.forEach(async (file) => {

            const img = await canvas.loadImage(dir + '/' + file);
            const results = await faceapi.detectAllFaces(img);

            const faces = await faceapi.extractFaces(img, results);

            // Check if this a new person
            //const outputDir = path.join(trainingDir, req.session.userId);
            const outputDir = path.resolve(__dirname, './faces/' + req.session.userId);

            if (!fs.existsSync(outputDir)) {
                console.info(`Creating training dir for new person '${req.session.userId}'.`);
                fs.mkdirSync(outputDir);
            }

            // Write detections to public folder
            fs.writeFileSync(path.join(outputDir, `${Date.now()}.jpg`), faces[0].toBuffer('image/jpeg'));
            console.info('New training sample saved.');
        });


        i = 1;
        return res.redirect("/account");
    } catch (error) {
        console.error(error);
    }
});

app.post("/upload-request-attend/:classroomId/:userId", function (req, res) {

    const dDate = moment().format('YYYYMMDD');
    const dir1 = path.resolve(__dirname, './requestattendance/' + req.params.classroomId )
    const dir2 = path.resolve(__dirname, './requestattendance/' + req.params.classroomId + '/' + dDate )
    //const dir3 = path.resolve(__dirname, './requestattendance/' + req.params.classroomId + '/' + dDate + '/' + req.params.userId)
    
    if (!fs.existsSync(dir1)) {
        console.info(`Creating requestattendance dir '${dir1}' .`);
        fs.mkdirSync(dir1);
    }

    // if (!fs.existsSync(dir2)) {
    //     console.info(`Creating requestattendance dir '${dir2}' .`);
    //     fs.mkdirSync(dir2);
    // }
    
    const storagecheck = multer.diskStorage({
        destination: function (req, file, cb) {

            if (!fs.existsSync(dir2)) {
                console.info(`Creating requestattendance dir '${dir2}' .`);
                return fs.mkdirSync(dir2, error => cb(error, dir2))
            }

            return cb(null, dir2)
            // fs.exists(dir, exist => {
            //     if (!exist) {
            //         return fs.mkdir(dir, error => cb(error, dir))
            //     }
            //     return cb(null, dir)
            // })
        },
        filename: function (req, file, cb) {

            cb(null, req.params.userId + '.jpg')
            //cb(null, req.session.userId + path.extname(file.originalname))
        }
    })

    var upload = multer({ storage: storagecheck, fileFilter: fileFilter }).any();

    upload(req, res, function (err) {
        if (err) {
            //console.log(err);
            return res.end("Error uploading file.");
        } else {
            //console.log(req.body);
            req.files.forEach(function (f) {
                console.log(f);
                // and move file to final destination...
            });

            return res.redirect("/student-classrooms/" + req.params.classroomId);

            //res.end("File has been uploaded");
        }
    });
});

app.post("/upload-attend-pic/:classroomId", async (req, res) => {

    console.info("Start training recognition model.")
    faceMatcher = await train();
    console.info("Finished training");

    const storagecheck = multer.diskStorage({
        destination: function (req, file, cb) {
            const dir = "./attendance/" + req.params.classroomId
            fs.exists(dir, exist => {
                if (!exist) {
                    return fs.mkdir(dir, error => cb(error, dir))
                }
                return cb(null, dir)
            })
        },
        filename: function (req, file, cb) {

            cb(null, req.params.classroomId + '-' + moment().format('YYYYMMDDHHMMSS') + '.jpg')
            //cb(null, req.session.userId + path.extname(file.originalname))
        }
    })

    var upload = multer({ storage: storagecheck, fileFilter: fileFilter }).any();

    upload(req, res, function (err) {
        if (err) {
            //console.log(err);
            return res.end("Error uploading file.");
        } else {
            //console.log(req.body);
            req.files.forEach(function (f) {
                console.log(f);

                detect(f, req.params.classroomId);
                console.log('done, saved results to out/' + req.params.classroomId)

            });

            return res.redirect("/my-classrooms/" + req.params.classroomId);

            //res.end("File has been uploaded");
        }
    });
});


async function train() {
    // Load required models
    await faceapi.nets.ssdMobilenetv1.loadFromDisk('weights');
    await faceapi.nets.faceLandmark68Net.loadFromDisk('weights');
    await faceapi.nets.faceRecognitionNet.loadFromDisk('weights');

    // Traverse the training dir and get all classes (1 dir = 1 class)
    const classes = fs.readdirSync(trainingDir, { withFileTypes: true })
        .filter(i => i.isDirectory())
        .map(i => i.name);
    console.info(`Found ${classes.length} different persons to learn.`);

    const faceDescriptors = await Promise.all(classes.map(async className => {

        const images = fs.readdirSync(path.join(trainingDir, className), { withFileTypes: true })
            .filter(i => i.isFile())
            .map(i => path.join(trainingDir, className, i.name));

        // Load all images for this class and retrieve face descriptors
        const descriptors = await Promise.all(images.map(async path => {
            const img = await canvas.loadImage(path);
            return await faceapi.computeFaceDescriptor(img);
        }));

        return new faceapi.LabeledFaceDescriptors(className, descriptors);
    }));

    return new faceapi.FaceMatcher(faceDescriptors);
}

let faceMatcher = null;
async function init() {

    console.info("Start training recognition model.")
    faceMatcher = await train();
    console.info("Finished training");
}

async function detect(files, folder) {

    // Load required models
    await faceapi.nets.ssdMobilenetv1.loadFromDisk('weights');
    await faceapi.nets.faceLandmark68Net.loadFromDisk('weights');
    await faceapi.nets.faceRecognitionNet.loadFromDisk('weights');
    // load the image
    const img = await canvas.loadImage(files.path)

    const results = await faceapi
        .detectAllFaces(img)
        .withFaceLandmarks()
        .withFaceDescriptors();

    console.info(`${results.length} face(s) detected`);

    // Create canvas to save to disk
    const out = faceapi.createCanvasFromMedia(img);
    results.forEach(async ({ detection, descriptor }) => {
        const label = faceMatcher.findBestMatch(descriptor).toString();
        const stuid = label.split(" ")[0]

        if (stuid != 'unknown') {
            console.info(`Detected face: ${label}`);
            console.log("./classrooms/take_attendance/" + folder + "/" + stuid);

            const student = stuid,
                classid = folder;

            const check = await Attendance.findOne({ classroom: classid, student: student, attendanceDate: moment().format('YYYY-MM-DD') });

            if (check == null) {
                var attendance = new Attendance({
                    classroom: classid,
                    student: student,
                    attendanceDate: moment().format('YYYY-MM-DD')
                });

                //console.log(attendance);

                try {
                    const result = await attendance.save();
                    if (result) {
                        console.log(student + ' Attendance Succesfully.');
                    }
                } catch (err) {
                    console.log(student + 'Already saved.');
                }
            } else {
                console.log(student + 'Not Save');
            }


            // axios.get("./classrooms/take_attendance/" + folder + "/" + stuid)
            //     .then(function (response) {
            //         // handle success
            //         console.log(response);
            //     })
            //     .catch(function (error) {
            //         // handle error
            //         console.log(error);
            //     })
            //     .then(function () {
            //         // always executed
            //         console.log("success");
            //     });
            // $.ajax({
            //     url: "/classrooms/take_attendance/<%= classroom._id %>/" + label,
            //     type: "GET",
            //     contentType: "application/json",
            //     processData: false,
            //     data: stuid,
            //     complete: function(d) {
            //         console.log(JSON.stringify(d.responseText));
            //     }
            // });
        }


        const drawBox = new faceapi.draw.DrawBox(detection.box, { label });
        drawBox.draw(out)
    });

    const dDate = moment().format('YYYY-MM-DD');

    const baseDir = path.resolve(__dirname, './out/' + folder + '/' + dDate);
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir)
    }
    // Write detections to public folder
    fs.writeFileSync(baseDir + '/' + files.filename, out.toBuffer('image/jpeg'));
    console.log('Detection saved.');
}

app.post("/upload-attend-pic/:classroomId/:studentId", function (req, res) {

    const storagecheck = multer.diskStorage({
        destination: function (req, file, cb) {
            const dir = "./attendance/" + req.params.classroomId
            fs.exists(dir, exist => {
                if (!exist) {
                    return fs.mkdir(dir, error => cb(error, dir))
                }
                return cb(null, dir)
            })
        },
        filename: function (req, file, cb) {

            cb(null, req.params.classroomId + '-' + req.params.studentId + '-' + moment().format('YYYYMMDD') + '.jpg')
            //cb(null, req.session.userId + path.extname(file.originalname))
        }
    })

    var upload = multer({ storage: storagecheck, fileFilter: fileFilter }).any();

    upload(req, res, function (err) {
        if (err) {
            //console.log(err);
            return res.end("Error uploading file.");
        } else {
            //console.log(req.body);
            req.files.forEach(function (f) {
                console.log(f);
                // and move file to final destination...
            });

            return res.redirect("/student-classrooms/" + req.params.classroomId);

            //res.end("File has been uploaded");
        }
    });
});

// Middleware for CSRF protection
app.use(csrf());

// Render Locals CSRF
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
});

// Router module
const registerRouter = require("./routes/register"),
    profileRouter = require("./routes/profile"),
    classroomRouter = require("./routes/classroom"),
    postRouter = require("./routes/post"),
    pageRouter = require("./routes/page");

// Routes
app.use(profileRouter);
app.use(registerRouter);
app.use(classroomRouter);
app.use(postRouter);
app.use(pageRouter);

// Catch 404 and forward to error handler
var notFoundCtrl = require("./controller/error.js");
app.use(notFoundCtrl.getNotFound);

// Server Error handler
// Define as the last app.use callback
app.use(function (err, req, res, next) {
    var statusCode = err.status || 500;
    res.render("error", {
        pageTitle: err.status,
        errorStatus: statusCode,
        errMessage: err.message
    });
});



/* 
app.get("/", (req, res) => res.redirect("/recognition"));
app.get("/recognition", (req, res) => {

  let claId = req.query.claId;
  let bachId = req.query.bachId;
  let sbjtId = req.query.sbjtId;
  if(claId && bachId && sbjtId){
    res.render ( "webcamFaceRecognitionQR", { users: users, claId: claId, bachId: bachId, sbjtId: sbjtId });
  }else{
    res.render ( "webcamFaceRecognition", { users: users });
  }

  });

app.get("/about", (req, res) => {
    res.render ( "about", { users: users});
  });  

app.post('/faceattend', function (req, res) {
  con.query('INSERT INTO attendances SET ?', req.body, 
        function (err, result) {
            if (err) throw err;
            return res.status(200).send('User added to database with ID: ' + result.insertId);
        }
    );
});  

app.post("/fetch_external_image", async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).send("imageUrl param required");
  }
  try {
    const externalResponse = await request(imageUrl);
    res.set("content-type", externalResponse.headers["content-type"]);
    return res.status(202).send(Buffer.from(externalResponse.body));
  } catch (err) {
    return res.status(404).send(err.toString());
  }
}); */

//app.listen(4000, () => console.log("Listening on port 4000!"));
// your express configuration here



function request(url, returnBuffer = true, timeout = 10000) {
    return new Promise(function (resolve, reject) {
        const options = Object.assign({}, {
            url,
            isBuffer: true,
            timeout,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36"
            }
        },
            returnBuffer ? { encoding: null } : {}
        );

        get(options, function (err, res) {
            if (err) return reject(err);
            return resolve(res);
        });
    });
}