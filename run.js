const cheerio = require('cheerio');
const request = require('request');
const notifier = require('node-notifier');
const separateReqPool = {maxSockets: 15};
const async = require('async');
let tweets={},apiurls=[];
const E = require('events');
const trigger = new E();



///////////////////////////  CONFIGURE TWITTER HANDLERS /////////////////////////////////////////////////////
var THandlers=[
    {
        name:'WhaleWatch',
        url:"https://twitter.com/whalewatchio?lang=en",
        keywords:"long",
    },
];
/////////////////////////////////////////////////////////////////////////////////////////////////////////////


console.log('Twitter => Desktop Notifications program is running');


//ADD TWEETS
THandlers.forEach((th,i) => {
    tweets[th.url] = [];
    apiurls.push(th.url);
});

const headers = {'user-agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36'};

//MONITOR
setInterval(() => {
    async.map(apiurls, function(item, callback){
        request({url: item,headers, pool: separateReqPool}, function (error, response, body) {
            try {
                const $ = cheerio.load(body);
                const turl = "https://twitter.com" + response.req.path;
                const title = THandlers.filter((d,i) => d.url === turl)[0].name;
                if(!tweets[turl].length){
                  //FIRST LOAD
                  tweets[turl] = $('div.tweet-text').toArray().map(d => { const t = $(d).text(); return t.substring(9,t.length-6)});
                }
                else{
                    //EVERY OTHER TIME
                    const newTweets = $('div.tweet-text').toArray().map(d => { const t = $(d).text(); return t.substring(9,t.length-6)});
                    const slicelen = newTweets.map(d => {return tweets[turl].indexOf(d);}).indexOf(0);
                    const ntweets = slicelen === -1 ? [] : newTweets.slice(0,slicelen);

                    ntweets.filter(d => {
                      const th_kw = THandlers.filter((d,i) => d.url === turl)[0].keywords.split(',');
                      if(th_kw.includes('*')){
                        return true;
                      } else{
                        const checkTexts = th_kw.map(kw => d.includes(kw) ? true : false);
                        return checkTexts.includes(false) ? false : true;
                      }
                    }).forEach(message => {
                      trigger.emit('NEWTWEET',{title,message});
                    });
                    tweets[turl] = newTweets;
                }
            } catch (e) {
                  console.log('Error =>' + e);
            }
        });
    }, function(err, results){
            //console.log(results);
    });
},5*1000);//RUNS EVERY 5 SECONDS

trigger.on('NEWTWEET',({title,message}) => {
  notifier.notify({title,message,sound: true},
    (err, response) => {
      // Response is response from notification
      if(err) console.log(err);
    }
  );
});
