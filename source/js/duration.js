!(function() {
  function update() {
    var now = new Date();
    var grt = new Date("2020-11-01 00:00:00");  /** 此处是计时的起始时间 **/
    now.setTime(now.getTime()+250);
    days = (now - grt ) / 1000 / 60 / 60 / 24;
    dnum = Math.floor(days);
    hours = (now - grt ) / 1000 / 60 / 60 - (24 * dnum);
    hnum = Math.floor(hours);
    if(String(hnum).length === 1 ){
      hnum = "0" + hnum;
    }
    minutes = (now - grt ) / 1000 /60 - (24 * 60 * dnum) - (60 * hnum);
    mnum = Math.floor(minutes);
    if(String(mnum).length === 1 ){
      mnum = "0" + mnum;
    }
    seconds = (now - grt ) / 1000 - (24 * 60 * 60 * dnum) - (60 * 60 * hnum) - (60 * mnum);
    snum = Math.round(seconds);
    if(String(snum).length === 1 ){
      snum = "0" + snum;
    }
    document.getElementById("timeDate").innerHTML = "This blog has been running &nbsp"+dnum+"&nbspdays";
    document.getElementById("times").innerHTML = hnum + "&nbsphours&nbsp" + mnum + "&nbspminutes&nbsp" + snum + "&nbspseconds";
  }
  setInterval(update, 1000);
})();
