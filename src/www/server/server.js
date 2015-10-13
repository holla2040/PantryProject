JsonRoutes.add("get", "/posts/:mac/:value/:gps", function (req, res, next) {
  var nobin = 1010;
  var x1 = 920;
  var y1 = 0;
  var x2 = 600;
  var y2 = 100;
  var m = (y2 - y1)/(x2 - x1);
  var b = y1 - (m * x1);

  console.log("post "+req.params.mac+" "+req.params.value+" "+req.params.gps);
  value = parseInt(req.params.value);
  valuePercent = Math.round(m*value + b); 

  valueStr = "n/a";
  extraStr = "";

  if ( value > nobin) {
    valueStr = "Bin Removed";
  } else {
      if (value > x1 ) {
        valueStr = "Empty";
      } else {
          if (value > x2 ) {
            valueStr = valuePercent+"%";
            if (valuePercent < 25) {
                extraStr = "Warning! Food container low";
            }
          } else {
            valueStr = "100%";
          }
      }
  }

  

  //scaledata.insert({ mac:req.params.mac,value:req.params.value,gps:req.params.gps});
  scaledata.update({'mac':req.params.mac},{$set:{'timestamp':String(new Date()).split(" ")[4],'value':valueStr,'gps':req.params.gps,'extra':extraStr}},{upsert:true});

  JsonRoutes.sendResult(res, 200, 0);
});




