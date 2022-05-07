const express = require("express");
const router = express.Router();
const pageController = require("../controller/page.js");
const classroomController = require("../controller/classroom");
const isAuth = require("../middleware/isAuth");

router.get("/announcement" ,isAuth , pageController.getAnnouncement);
router.get("/terms" ,isAuth , pageController.getTerms);
router.get("/securitypolicy" ,isAuth , pageController.getPolicy);
router.get("/pdpapolicy" ,isAuth , pageController.getPDPAPolicy);
router.get("/test" ,isAuth , pageController.getTest);

module.exports = router;
