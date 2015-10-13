Tracker.autorun(function(){
    if (!Session.get('browserid')) {
        var browserid = amplify.store("browserid");
        if (!browserid) {
            browserid = Random.id();
            amplify.store("browserid", browserid);
        }
        Session.set('browserid', browserid);
    }
    // console.log(Session.get('browserid')); 
});

Template.scaledata.helpers({
    scaledataGet: function () {
      return scaledata.find({});
    }
  });


Template.registerHelper('signup', function(a) {
});

Template.registerHelper('trigger', function(a) {
});


