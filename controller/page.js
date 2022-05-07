exports.getAnnouncement = (req, res, next) => {

  var val = req.session;
  //console.log(val);

  return res.render("page/announcement", {
      pageTitle: "Announcement",
      user: val
  });
};

exports.getTerms = (req, res, next) => {

  var val = req.session;
  //console.log(val);

  return res.render("page/terms", {
      pageTitle: "Term & Conditions",
      user: val
  });
};

exports.getPolicy = (req, res, next) => {

  var val = req.session;
  //console.log(val);

  return res.render("page/policy", {
      pageTitle: "Policy & Security",
      user: val
  });
};

exports.getPDPAPolicy = (req, res, next) => {

  var val = req.session;
  //console.log(val);

  return res.render("page/policy", {
      pageTitle: "PDPA Policy",
      user: val
  });
};

exports.getTest = (req, res, next) => {

  var val = req.session;
  //console.log(val);

  return res.render("page/test", {
      pageTitle: "Title test",
      user: val
  });
};