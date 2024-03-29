window.myApp = window.myApp || {};
myApp.dashboard = (function($) {
  var _template = "",
    _loaded = 0,
    _intervalId = 0,
    _start = Date.now(),
    _refresh = ((typeof(__refresh) == "number") ? __refresh : 300),
    $_container = {},
    //$_prograss = {},
    //$_countdown = {},
    $_lastUpdate = {},
    $_servertitle = {},
    showarr = [],
    tmpdate, datestr = "",
    error = false;

  function init() {
    _start = Date.now();
    _template = $('#server-template').html();
    $_container = $('#server-container').html('');
    $_servertitle = $('#server-title').html('');
    //$_prograss = $('.loading');
    //$_countdown = $('.countdown');
    $_lastUpdate = $('#last-update');
    showarr = [];
    $_servertitle.append("<th style=\"width:21%\"></th>");
    $_servertitle.append("<th style=\"width:9%\">Last 30 Days</th>");

    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    var monthget = new Date();

    for (var d = 6; d >= 0; d--) {
      dayget = new Date(Date.parse(new Date().toString()) - 86400000 * d);
      datestr = dayget.getDate() + " " + monthNames[monthget.getMonth()];
      $_servertitle.append("<th style=\"width:10%\">" + datestr + "</th>");
    }
    error = false;
    for (var i in __apiKeys) {
      getUptime(__apiKeys[i], i);
    }
    _intervalId = setInterval(countdown, 1000);
  }
  /* load uptime variables from uptimerobot
   * this calls jsonUptimeRobotApi() when loaded
   */
  function getUptime(apikey, ids) {
    var url = "https://api.uptimerobot.com/getMonitors?apiKey=" + apikey + "&customUptimeRatio=1-2-3-4-5-6-7-30&format=json&logs=1&noJsonCallback=1";
    $.ajax({
      url: url,
      context: document.body,
      dataType: "json",
      success: function(str) {
        placeServer(str.monitors.monitor[0], ids);
      }
    });
  }
  /* places the html on the page */
  function placeServer(data, ids) {
    data.alert = "";
    switch (parseInt(data.status, 10)) {
      case 0:
        data.statustxt = "Unknown";
        data.statusicon = "help";
        data.label = "blue";
        break;
      case 1:
        data.statustxt = "Unknown";
        data.statusicon = "help";
        data.label = "blue";
        break;
      case 2:
        data.statustxt = "OK";
        data.statusicon = "check_circle";
        data.label = "light-green";
        data.alert = "";
        break;
      case 8:
        data.statustxt = "Down";
        data.statusicon = "error";
        data.label = "orange";
        data.alert = "warning";
        error = true;
        break;
      case 9:
        data.statustxt = "Failed";
        data.statusicon = "remove_circle";
        data.label = "red";
        data.alert = "danger";
        error = true;
        break;
    }
    //ony show last month of logs
    var lastMonth = Date.parse('-1month');
    for (var i in data.log) {
      var log = data.log[i],
        dateTime = Date.parse(log.datetime.replace(/\/(\d\d) /, '/20$1 '));
      if (dateTime < lastMonth) {
        data.log.splice(i, i + 1);
      } else {
        data.log[i].datetime = dateTime;
      }
    }
    data.log = $.merge([], data.log);
    //make sure log is set
    var endtime, endtype, starttime, starttype, fintime, period, fin = [],
      lastlen = 1;
    period = 86400000 * 1;
    endtime = Date.parse(new Date().toString());
    fintime = endtime - period;
    starttime = fintime;
    if (!data.log.length) {
      switch (parseInt(data.status, 10)) {
        case 2:
          starttype = 2;
          //green
          break;
        case 8:
        case 9:
          starttype = 1;
          //red
          break;
        default:
          starttype = 0;
          //grey
      }
      fin.push({
        type: starttype,
        len: 1,
        left: fintime,
        right: endtime
      })
    } else {
      for (var r = 0; r < data.log.length; r++) {
        starttime = data.log[r].datetime;
        if (starttime < fintime) {
          starttime = fintime;
        }
        endtype = data.log[r].type;
        switch (parseInt(endtype, 10)) {
          case 1:
            endtype = 1;
            //grey
            break;
          case 2:
            endtype = 2;
            //green
            break;
          default:
            endtype = 0;
            //grey
        }
        lastlen = lastlen - (endtime - starttime) / period;
        if (fin.length > 0 && fin[fin.length - 1].type == endtype) {
          fin[fin.length - 1].len += (endtime - starttime) / period;
          fin[fin.length - 1].left = starttime;
        } else {
          fin.push({
            type: endtype,
            len: (endtime - starttime) / period,
            left: starttime,
            right: endtime
          });
        }
        endtime = starttime;
        if (starttime <= fintime) {
          break;
        }
      }
      if (starttime > fintime) {
        switch (parseInt(endtype, 10)) {
          case 1:
            starttype = 2;
            //grey
            break;
          case 2:
            starttype = 1;
            //green
            break;
          default:
            starttype = 0;
            //grey
        }
        if (fin.length > 0 && fin[fin.length - 1].type == endtype) {
          fin[fin.length - 1].len += lastlen;
          fin[fin.length - 1].left = fintime;
        } else {
          fin.push({
            type: starttype,
            len: lastlen,
            start: fintime,
            end: fin[fin.length - 1].left
          });
        }
      }
    }
    var st, temptip;
    data.progress = [];
    while (st = fin.pop()) {
      temptip = "" + Type2Word(parseInt(st.type), true);
      if (st.len == 1) {
        temptip += " (近24小时)"
      } else {
        if (st.right - st.left < 1000 * 3540) {
          temptip += " (" + new Number((st.right - st.left) / (1000 * 60)).toFixed(0) + " 分钟)";
        } else {
          temptip += " (" + new Number((st.right - st.left) / (1000 * 3600)).toFixed(1) + " 小时)";
        }
        temptip += "<br><span class=\"ttime\">" + num2string(st.left) + " ~ " + num2string(st.right) + "</span>";
      }
      data.progress.push({
        type: st.type,
        types: getLogType,
        len: (st.len * 100).toString(),
        stattip: temptip
      })
    }
    // gather data for the graphs
    var uptimes = data.customuptimeratio.split("-");
    for (var a = 6; a >= 1; a--) {
      uptimes[a] = uptimes[a] * (a + 1) - uptimes[a - 1] * (a);
    }
    var uptimeb = [],
      th, tm;
    for (a = 0; a < uptimes.length; a++) {
      tm = (100 - uptimes[a]) * (a == uptimes.length - 1 ? 14.40 * 30 : 14.40);
      th = tm / 60;
      uptimeb[a] = Math.round(uptimes[a] * 100) / 100 + "%"
    }
    //uptimes.push(data.alltimeuptimeratio);
    data.charts = [{
      title: '1',
      uptimes: uptimes[7],
      uptime: uptimeb[7],
      uptype: getUptimeColor,
      upsign: getUptimeSign
    }, {
      title: '2',
      uptimes: uptimes[6],
      uptime: uptimeb[6],
      uptype: getUptimeColor,
      upsign: getUptimeSign
    }, {
      title: '3',
      uptimes: uptimes[5],
      uptime: uptimeb[5],
      uptype: getUptimeColor,
      upsign: getUptimeSign
    }, {
      title: '4',
      uptimes: uptimes[4],
      uptime: uptimeb[4],
      uptype: getUptimeColor,
      upsign: getUptimeSign
    }, {
      title: '5',
      uptimes: uptimes[3],
      uptime: uptimeb[3],
      uptype: getUptimeColor,
      upsign: getUptimeSign
    }, {
      title: '6',
      uptimes: uptimes[2],
      uptime: uptimeb[2],
      uptype: getUptimeColor,
      upsign: getUptimeSign
    }, {
      title: '7',
      uptimes: uptimes[1],
      uptime: uptimeb[1],
      uptype: getUptimeColor,
      upsign: getUptimeSign
    }, {
      title: 'all',
      uptimes: uptimes[0],
      uptime: uptimeb[0],
      uptype: getUptimeColor,
      upsign: getUptimeSign
    }];
    var $output = $(Mustache.render(_template, data));
    //append it in the container
    showarr[ids] = $output;
    for (var k = 0; k < __apiKeys.length; k++) {
      if (showarr[k] == undefined) {
        break;
      } else if (showarr[k] == true) {
        continue;
      } else {
        $_container.append(showarr[k]);
        showarr[k] = true;
      }
    }
    _loaded++;
    if (_loaded >= __apiKeys.length) {
      _loaded = 0;
      $('.set-tooltip').tooltip({
        html: true
      });
      $('#stattip-load').addClass('hide');
      if (error) {
        $('#stattip-err').removeClass('hide');
        $('#stattip-ok').addClass('hide');
      } else {
        $('#stattip-ok').removeClass('hide');
        $('#stattip-err').addClass('hide');
      }
    }
  }
  /* count down till next refresh */
  function countdown() {
    var now = Date.now(),
      elapsed = parseInt((now - _start) / 1000, 10),
      mins = Math.floor((_refresh - elapsed) / 60),
      secs = _refresh - (mins * 60) - elapsed;
    secs = (secs < 10) ? "0" + secs : secs;
    //$_countdown.width(100 - (elapsed * (100 / _refresh)) + '%');
    if (elapsed > _refresh) {
      clearInterval(_intervalId);
      init();
    } else {
      $_lastUpdate.html(mins + ':' + secs);
    }
  }
  /* give the icon in front of log line a nice color */
  function getLogType() {
    switch (parseInt(this.type, 10)) {
      case 1:
        return "danger";
      case 2:
        return "success";
      case 99:
        return "default";
      case 98:
        return "default";
      default:
        return "default";
    }
  }

  function Type2Word(t, icon) {
    switch (t) {
      case 1:
        return (icon ? "<i class=\"material-icons\">error</i> " : "") + "Fail";
      case 2:
        return (icon ? "<i class=\"material-icons\">check_box</i> " : "") + "Normal";
        //case 99:
        //	return "Unknown";
        //case 98:
        //	return "Unknown";
      default:
        return (icon ? "<i class=\"material-icons\">help</i> " : "") + "Unknown";
    }
  }

  function num2string(num) {
    tmpdate = new Date(parseInt(num));
    datestr = (tmpdate.getMonth() + 1) + "-" + tmpdate.getDate() + " " + tmpdate.getHours() + ":" + (tmpdate.getMinutes() < 10 ? "0" + tmpdate.getMinutes() : tmpdate.getMinutes());
    return datestr;
  }

  function getUptimeColor() {
    var upt = this.uptimes;
    if (upt >= 99.90) {
      return "green";
    } else if (upt >= 95.00) {
      return "orange";
    } else {
      return "red";
    }
  }

  function getUptimeSign() {
    var upt = this.uptimes;
    if (upt >= 99.90) {
      return "check_box";
    } else if (upt >= 95.00) {
      return "error";
    } else {
      return "indeterminate_check_box";
    }
  }
  return {
    init: init
  };
}(jQuery));
