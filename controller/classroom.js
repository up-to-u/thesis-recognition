const Classroom = require("../models/classroom");
const Registration = require("../models/registration");
const User = require("../models/user");
const Attendance = require("../models/attendance");
const { validationResult } = require("express-validator/check");
const ITEMS_PER_PAGE = 100;
const moment = require('moment');
const ObjectId = require('mongoose').Types.ObjectId
const path = require('path');
const fs = require('fs');



let totalItems, page;


exports.getClassroom = async (req, res, next) => {

    console.log("Class Room");
    var val = req.session;
    var message = req.flash("notification");
    page = +req.query.page || 1;

    try {
        const classrooms = Classroom.find().countDocuments();
        const numProducts = await Classroom.find()
            .skip((page - 1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE);

        totalItems = numProducts;

        res.render("classroom/classroom-list", {
            pageTitle: "Class Room",
            classrooms: classrooms,
            errMessage: message.length > 0 ? message[0] : null,
            itemsPerPage: ITEMS_PER_PAGE,
            totalItems: totalItems,
            currentPage: page,
            hasNextPage: ITEMS_PER_PAGE * page < totalItems,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
            user: val
        });

    } catch (err) {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    }
};

exports.getClassroom = async (req, res, next) => {

    var val = req.session;
    var message = req.flash("notification");
    page = +req.query.page || 1;
    try {
        const numProducts = await Classroom.find().countDocuments();
        const classrooms = await Classroom.find()
            .skip((page - 1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE);

        totalItems = numProducts;

        res.render("classroom/classroom-list", {
            pageTitle: "Class Room",
            classrooms: classrooms,
            errMessage: message.length > 0 ? message[0] : null,
            itemsPerPage: ITEMS_PER_PAGE,
            totalItems: totalItems,
            currentPage: page,
            hasNextPage: ITEMS_PER_PAGE * page < totalItems,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
            user: val
        });
    } catch (err) {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    }

};

exports.getClassroomDetail = async (req, res, next) => {
    var message = req.flash("notification");
    try {
        const classroom = await Classroom.findById(req.params.classroomId);
        res.render("classroom/classroom-detail", {
            pageTitle: post.title,
            classroom: classroom,
            errMessage: message.length > 0 ? message[0] : null
        });
    } catch (err) {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    }

};

exports.getAuthorClassroomDetail = async (req, res, next) => {

    var message = req.flash("notification");
    var val = req.session;
    if (!req.session.userId && req.session.userType == 'Teacher') {
        const error = new Error("Access Denied");
        error.status = 404;
        next(error);
    }

    const classDir = path.resolve(__dirname, '../out/' + req.params.classroomId);
    if (!fs.existsSync(classDir)) {
        fs.mkdirSync(classDir)
    }

    try {
        const classroom = await Classroom.findById(req.params.classroomId);
        // const registrations = await Registration.find({ classroom: req.params.classroomId });
        // const attendances = await Attendance.find({ classroom: req.params.classroomId });

        const registrations = await User.aggregate([
            {
                $project: {
                    "_id": {
                        "$toString": "$_id"
                    },
                    "firstname": 1,
                    "lastname": 1,
                    "email": 1,
                    "username": 1
                }
            },
            {
                $lookup: {
                    from: "registrations", // secondary collection
                    localField: '_id',
                    foreignField: 'student',
                    as: 'registration' // output to be stored
                }
            },
            {
                $unwind: '$registration'
            },
            {
                $match: {
                    'registration.classroom': req.params.classroomId
                }
            }
        ])

        const attendances = await Attendance.aggregate([ 
            {
                $match: {
                    classroom: req.params.classroomId
                }
            },
            {
                $lookup: {
                    from: 'users', // secondary db
                    localField: 'student',
                    foreignField: '_id',
                    as: 'user' // output to be stored
                }
            }
        ]);

        console.log(registrations);

        const dDate = moment().format('YYYY-MM-DD');
        const baseDir = path.resolve(__dirname, '../out/' + req.params.classroomId + '/' + dDate);
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir)
        }

        let files = fs.readdirSync(baseDir);

        console.log(files);

        res.render("classroom/my-classroom-detail", {
            pageTitle: classroom.title,
            classroom: classroom,
            registrations: registrations,
            attendances: attendances,
            today: moment().format('YYYY-MM-DD'),
            user: val,
            imglist: files,
            errMessage: message.length > 0 ? message[0] : null
        });
    } catch (err) {

        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    }

};

exports.getAuthorClassroomAttendance = async (req, res, next) => {

    var message = req.flash("notification");
    var val = req.session;
    if (!req.session.userId && req.session.userType == 'Teacher') {
        const error = new Error("Access Denied");
        error.status = 404;
        next(error);
    }

    try {
        const classroom = await Classroom.findById(req.params.classroomId);
        // const registrations = await Registration.find({ classroom: req.params.classroomId });
        // const attendances = await Attendance.find({ classroom: req.params.classroomId });

        const attendances = await User.aggregate([
            {
                $project: {
                    "_id": {
                        "$toString": "$_id"
                    },
                    "firstname": 1,
                    "lastname": 1,
                    "email": 1,
                    "username": 1
                }
            },
            {
                $lookup: {
                    from: "attendances", // secondary collection
                    localField: '_id',
                    foreignField: 'student',
                    as: 'attendance' // output to be stored
                }
            },
            {
                $unwind: '$attendance'
            },
            {
                $match: {
                    'attendance.classroom': req.params.classroomId
                }
            }
        ])

        const dDate = moment().format('YYYYMMDD');
        const dir1 = path.resolve(__dirname, '../requestattendance/' + req.params.classroomId )
        const dir2 = path.resolve(__dirname, '../requestattendance/' + req.params.classroomId + '/' + dDate )
        
        if (!fs.existsSync(dir1)) {
            console.info(`Creating requestattendance dir '${dir1}' .`);
            fs.mkdirSync(dir1);
        }
    
        if (!fs.existsSync(dir2)) {
            console.info(`Creating requestattendance dir '${dir2}' .`);
            fs.mkdirSync(dir2);
        }

        let files = fs.readdirSync(dir2);

        console.log("allfiles : ",files);

        res.render("classroom/my-classroom-attendance", {
            pageTitle: classroom.title,
            classroom: classroom,
            attendances: attendances,
            today: moment().format('YYYYMMDD'),
            user: val,
            imglist: files,
            errMessage: message.length > 0 ? message[0] : null,
            moment: moment
        });
    } catch (err) {

        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    }

};

exports.getAddClassroom = (req, res, next) => {

    let message = req.flash("notification");
    var val = req.session;

    return res.render("classroom/add-classroom", {
        pageTitle: "Add Classroom",
        oldInput: {
            title: '',
            description: ''
        },
        errMessage: message.length > 0 ? message[0] : null,
        errFields: {
            errTitle: '',
            errDesc: ''
        },
        user: val,
    });
};

exports.postAddClassroom = async (req, res, next) => {

    var val = req.session;
    if (!req.session.userId) {
        const error = new Error("Access Denied");
        error.status = 402;
        next(error);
    }
    const author = req.session.userId,
        title = req.body.title,
        description = req.body.description;

    let valError = validationResult(req),
        errArray = valError.array();

    if (!valError.isEmpty()) {
        let eTitle, eDesc;
        errArray.forEach(i => {
            switch (i.param) {
                case 'title':
                    eTitle = i.msg;
                    break;
                case 'description':
                    eDesc = i.msg;
                    break;
            }
        })

        return res.render("classroom/add-classroom", {
            pageTitle: "Add Classroom",
            oldInput: {
                title,
                description,
            },
            errFields: {
                errTitle: eTitle,
                errDesc: eDesc,
            },
            user: val,
        });
    }

    var classroom = new Classroom({
        title: title,
        description: description,
        author: {
            userId: author
        }
    });

    try {
        const result = await classroom.save();
        if (result) {
            req.flash("notification", "New Classroom added");
            res.redirect("/my-classrooms");
        }
    } catch (err) {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    }
};


exports.getEditClassroom = async (req, res, next) => {
    try {
        const classroom = await Classroom.findOne({
            _id: req.params.classroomId,
            author: { userId: req.session.userId }
        })
        return res.render("classroom/edit-classroom", {
            pageTitle: "Edit Classroom",
            classroom: classroom,
            errFields: {
                errTitle: '',
                errDesc: '',
            }
        });
    } catch (err) {
        return next(err);
    }
};

exports.postEditClassroom = async (req, res, next) => {
    if (!req.session.userId) {
        const error = new Error("Access Denied");
        error.status = 402;
        next(error);
    }

    let valError = validationResult(req),
        errArray = valError.array();

    const classroom = await Classroom.findOne({ _id: req.body.classroomId, author: { userId: req.session.userId } });
    if (!classroom) return next(new Error("Not authorize"));

    classroom.title = req.body.title;
    classroom.description = req.body.description;

    if (!valError.isEmpty()) {
        let eTitle, eDesc;
        errArray.forEach(i => {
            switch (i.param) {
                case 'title':
                    eTitle = i.msg;
                    break;
                case 'description':
                    eDesc = i.msg;
                    break;
            }
        })

        return res.render("classroom/edit-classroom", {
            pageTitle: "Edit Classroom",
            errFields: {
                errTitle: eTitle,
                errDesc: eDesc,
            },
            classroom: classroom
        });
    }

    try {
        const result = await classroom.save();
        if (result) {
            req.flash("notification", result.title + " edited successfully");
            res.redirect("/classrooms/" + req.body.classroomId);
        }
    } catch (err) {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    }
};

exports.deleteClassroom = async (req, res, next) => {
    const classroomId = req.params.classroomId;
    try {
        const classroom = await Post.findByIdAndRemove(classroomId);
        if (classroom) {
            res.status(200).json({ message: 'Classroom removed' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error in deleting classroom' });
    }
};

exports.getAuthorClassroom = async (req, res, next) => {
    console.log("My Classroom");
    var val = req.session;
    if (!req.session.userId) {
        var error = new Error("Access Denied");
        error.status = 402;
        next(error);
    }

    var message = req.flash("notification");
    page = +req.query.page || 1;

    try {
        const classroomCount = await Classroom.find().countDocuments();
        const classrooms = await Classroom.find({ author: { userId: req.session.userId } })
            .skip((page - 1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE);

        //console.log(classrooms);

        totalItems = classroomCount;
        return res.render("classroom/my-classroom-list", {
            pageTitle: "My Classroom",
            classrooms: classrooms,
            errMessage: message.length > 0 ? message[0] : null,
            totalItems: totalItems,
            itemsPerPage: ITEMS_PER_PAGE,
            currentPage: page,
            hasNextPage: ITEMS_PER_PAGE * page < totalItems,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
            user: val,
            moment: moment
        });
    } catch (err) {
        console.log(error);
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    }
};

exports.getStudentClassroom = async (req, res, next) => {

    var val = req.session;
    if (!req.session.userId) {
        var error = new Error("Access Denied");
        error.status = 402;
        next(error);
    }

    //console.log("userId: ", req.session.userId);

    var message = req.flash("notification");
    page = +req.query.page || 1;

    console.log("Classroom List : ", req.session.userId);

    try {
        const registrationCount = await Registration.find().countDocuments();
        //const registrations = await Registration.find({ student: req.session.userId })
        // .skip((page - 1) * ITEMS_PER_PAGE)
        // .limit(ITEMS_PER_PAGE);

        const registrations = await Registration.aggregate([
            {
                $project: {
                    "classroom": {
                        "$toObjectId": "$classroom"
                    },
                    "student": {
                        "$toObjectId": "$student"
                    }
                }
            },
            {
                $lookup: {
                    from: "classrooms", // secondary collection
                    localField: 'classroom',
                    foreignField: '_id',
                    as: 'class' // output to be stored
                }
            },
            {
                $unwind: '$class'
            },
            {
                $match: {
                    student: ObjectId(req.session.userId)
                }
            }
        ])
            .skip((page - 1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE);

        /* const registrations = await Registration.find({ student: { userId: req.session.userId } })
              .skip((page - 1) * ITEMS_PER_PAGE)
              .limit(ITEMS_PER_PAGE); */

        /* const registrations = await Registration.aggregate([
                  { "$match": { "student": { userId: req.session.userId } } },
                  { "$unwind": "$classroomId" },
                  {
                      "$lookup": {
                          "from": "classrooms",
                          "localField": "registration.classroom",
                          "foreignField": "_id",
                          "as": "registrationArray"
                      }
                  },
                  { "$unwind": "$registrationArray" }]); */

        console.log("Registration: ", registrations);

        totalItems = registrationCount;
        return res.render("classroom/my-registration-list", {
            pageTitle: val.userEmail + " Classroom",
            registrations: registrations,
            errMessage: message.length > 0 ? message[0] : null,
            totalItems: totalItems,
            itemsPerPage: ITEMS_PER_PAGE,
            currentPage: page,
            hasNextPage: ITEMS_PER_PAGE * page < totalItems,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
            user: val,
            userId: req.session.userId
        });
    } catch (err) {
        console.log(error);
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    }
};

exports.getStudentClassroomDetail = async (req, res, next) => {

    //console.log(req.params);
    var todaycheck = false;

    var message = req.flash("notification");
    var val = req.session;
    if (!req.session.userId && req.session.userType == 'Student') {
        const error = new Error("Access Denied");
        error.status = 404;
        next(error);
    }

    try {
        const classroom = await Classroom.findById(req.params.classroomId);
        const registrations = await Registration.find({ student: req.session.userId, classroom: req.params.classroomId });
        const attendances = await Attendance.find({ student: req.session.userId, classroom: req.params.classroomId });

        const todayattend = await Attendance.findOne(
            {
                student: req.session.userId, classroom: req.params.classroomId
            },
            {
                _id: 0,
                'attendanceDate': 1
            },
            {
                sort: {
                    '_id':  1
                }
            }
        )


        if(todayattend == null){
            todaycheck = false;
            console.log('Null or undefined value!');
        }else{
            todaycheck = (moment(todayattend.attendanceDate).format('YYYYMMDD') == moment().format('YYYYMMDD'))?true:false;
        }

        // //const todaycheck = (moment(todayattend.attendanceDate).format('YYYYMMDD') == moment().format('YYYYMMDD'))?true:false;
        //console.log(todaycheck)

        const dDate = moment().format('YYYYMMDD');
        const dir1 = path.resolve(__dirname, '../requestattendance/' + req.params.classroomId )
        const dir2 = path.resolve(__dirname, '../requestattendance/' + req.params.classroomId + '/' + dDate )
        //const dir3 = path.resolve(__dirname, '../requestattendance/' + req.params.classroomId + '/' + dDate + '/' + req.session.userId)
        
        if (!fs.existsSync(dir1)) {
            console.info(`Creating requestattendance dir '${dir1}' .`);
            fs.mkdirSync(dir1);
        }
    
        if (!fs.existsSync(dir2)) {
            console.info(`Creating requestattendance dir '${dir2}' .`);
            fs.mkdirSync(dir2);
        }

        // if (!fs.existsSync(dir3)) {
        //     console.info(`Creating requestattendance dir '${dir3}' .`);
        //     fs.mkdirSync(dir3);
        // }

        let files = fs.readdirSync(dir2);

        const dDate2 = moment().format('YYYY-MM-DD');
        const baseDir1 = path.resolve(__dirname, '../out/' + req.params.classroomId );
        const baseDir2 = path.resolve(__dirname, '../out/' + req.params.classroomId + '/' + dDate2);

        if (!fs.existsSync(baseDir1)) {
            console.info(`Creating out dir '${baseDir1}' .`);
            fs.mkdirSync(baseDir1);
        }

        if (!fs.existsSync(baseDir2)) {
            console.info(`Creating out dir '${baseDir2}' .`);
            fs.mkdirSync(baseDir2);
        }

        let filesCheck = fs.readdirSync(baseDir2);

        //console.log(filesCheck);

        res.render("classroom/student-classroom-detail", {
            pageTitle: classroom.title,
            classroom: classroom,
            registrations: registrations,
            attendances: attendances,
            today: moment().format('YYYYMMDD'),
            today2: dDate2,
            todaycheck: todaycheck,
            user: val,
            imglist: files,
            imgclasslist: filesCheck,
            moment: moment,
            errMessage: message.length > 0 ? message[0] : null
        });
    } catch (err) { 

        const error = new Error(err);
        console.log(error)
        error.httpStatusCode = 500;
        return next(error);
    }

};

exports.getStudentClassroomDetail2 = async (req, res, next) => {

    var message = req.flash("notification");
    var val = req.session;
    if (!req.session.userId && req.session.userType == 'Student') {
        const error = new Error("Access Denied");
        error.status = 404;
        next(error);
    }

    try {
        const classroom = await Classroom.findById(req.params.classroomId);
        const registrations = await Registration.find({ student: req.session.userId, classroom: req.params.classroomId });
        const attendances = await Attendance.find({ student: req.session.userId, classroom: req.params.classroomId });

        const todayattend = await Attendance.findOne(
            {
                student: req.session.userId, classroom: req.params.classroomId
            },
            {
                _id: 0,
                'attendanceDate': 1
            },
            {
                sort: {
                    '_id':  1
                }
            }
        )

        const todaycheck = (moment(todayattend.attendanceDate).format('YYYYMMDD') == moment().format('YYYYMMDD'))?true:false;
        console.log(todaycheck)

        const dDate = moment().format('YYYYMMDD');
        const dir1 = path.resolve(__dirname, '../requestattendance/' + req.params.classroomId )
        const dir2 = path.resolve(__dirname, '../requestattendance/' + req.params.classroomId + '/' + dDate )
        //const dir3 = path.resolve(__dirname, '../requestattendance/' + req.params.classroomId + '/' + dDate + '/' + req.session.userId)


        
        if (!fs.existsSync(dir1)) {
            console.info(`Creating requestattendance dir '${dir1}' .`);
            fs.mkdirSync(dir1);
        }
    
        if (!fs.existsSync(dir2)) {
            console.info(`Creating requestattendance dir '${dir2}' .`);
            fs.mkdirSync(dir2);
        }

        // if (!fs.existsSync(dir3)) {
        //     console.info(`Creating requestattendance dir '${dir3}' .`);
        //     fs.mkdirSync(dir3);
        // }

        let files = fs.readdirSync(dir2);

        const dDate2 = moment().format('YYYY-MM-DD');
        const baseDir = path.resolve(__dirname, '../out/' + req.params.classroomId + '/' + dDate2);
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir)
        }

        let filesCheck = fs.readdirSync(baseDir);

        console.log(filesCheck);

        res.render("classroom/student-classroom-detail", {
            pageTitle: classroom.title,
            classroom: classroom,
            registrations: registrations,
            attendances: attendances,
            today: moment().format('YYYYMMDD'),
            today2: dDate2,
            todayattend: moment(todayattend.attendanceDate).format('YYYYMMDD'),
            todaycheck: todaycheck,
            user: val,
            imglist: files,
            imgclasslist: filesCheck,
            moment: moment,
            errMessage: message.length > 0 ? message[0] : null
        });
    } catch (err) { 

        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    }

};

exports.getRegisClassroom = async (req, res, next) => {

    var val = req.session;

    //console.log("session ====>", req.session);

    if (!req.session.userId) {
        const error = new Error("Access Denied");
        error.status = 402;
        next(error);
    }
    const student = req.session.userId,
        classid = req.params.classroomId;

    //const check = await Registration.findOne({ classroom: { classroomId: classid }, student: { userId: student } });
    const check = await Registration.findOne({ classroom: classid, student: student });
    //if (check === null) return next(new Error("already registration"));   

    //console.log("check ====>", check);

    if (check == null) {
        var registration = new Registration({
            /* classroom: {
                classroomId: classid
              },
            student: {
              userId: student
            }, */
            classroom: classid,
            student: student,
            dateAdded: new Date(Date.now())
        });

        //console.log(registration);

        try {
            const result = await registration.save();
            if (result) {
                req.flash("notification", "New Classroom added");
                res.redirect("/classrooms");
            }
        } catch (err) {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        }
    } else {
        req.flash("notification", "You Already Add This Class");
        res.redirect("/classrooms");
    }
};

exports.getTakeAttendance = async (req, res, next) => {

    let message = req.flash("notification");
    var val = req.session;

    if (!req.session.userId) {
        const error = new Error("Access Denied");
        error.status = 402;
        next(error);
    }

    const student = req.params.studentId,
        classid = req.params.classroomId;

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
                req.flash("notification", student + ' Attendance Succesfully.');
                //res.status(200).json({ message: student + ' Attendance Succesfully.' });
            }
        } catch (err) {
            req.flash("notification", student + ' Already Attendance.');
            //res.status(500).json({ message: student + 'Already saved.' });
        }
    } else {
        req.flash("notification", student + ' Not Attendance.');
        //res.status(500).json({ message: student + 'Not Save' });
    }

    
    res.redirect("/my-classrooms-attendance/"+classid);
    

};

// DELETE route PROFILE EDIT PAGE
exports.removeAttendance = async(req, res, next) => {
    var userId = req.params.userId;
    try{
      const attend = await Attendance.findByIdAndRemove(userId);
      if(!attend) return next(new Error("This attendance does not exist"));
      req.flash("notification", attend.student + " was removed");
      res.redirect("/my-classrooms-attendance/"+attend.classroom);
    } catch(err) {
      res.status(500).json({ message: "Error in deleting attendance" });
    }
  
  };
