const cheerio = require('cheerio');
const request = require('request');
const notifier = require('node-notifier');
var separateReqPool = {maxSockets: 15};
var async = require('async');
var tweets={},apiurls=[],N=[];


///////////////////////////  CONFIGURE TWITTER HANDLERS /////////////////////////////////////////////////////
var THandlers=[
    {
        name:'WhaleWatch',
        url:"https://twitter.com/whalewatchio?lang=en",
        keywords:"long",
    },
    {
        name:'Karthik',
        url:"https://twitter.com/Karthikdk72?lang=en",
        keywords:"*",
    }
];
/////////////////////////////////////////////////////////////////////////////////////////////////////////////


console.log('Tweet monitor app has started');


//ADD TWEETS
THandlers.forEach((th,i) => {
    tweets[th.url] = [];
    apiurls.push(th.url);
});


//MONITOR
setInterval(() => {
    async.map(apiurls, function(item, callback){
        request({url: item, pool: separateReqPool}, function (error, response, body) {
            try {
                const $ = cheerio.load(body);
                var turl = "https://twitter.com" + response.req.path;
                if(!tweets[turl].length){
                    //FIRST LOAD
                    for(let i=0;i<$('div.js-tweet-text-container p').length;i++){
                        tweets[turl].push($('div.js-tweet-text-container p').eq(i).text());
                    }
                }
                else{
                    //EVERY OTHER TIME
                    for(let i=0;i<$('div.js-tweet-text-container p').length;i++){
                        const s_tweet = $('div.js-tweet-text-container p').eq(i).text();
                        const l_tweet = `https://twitter.com${$('.js-stream-tweet').eq(i).attr("data-permalink-path")}`;
                        //CHECK IF TWEET IS NEWS
                        if(tweets[turl].indexOf(s_tweet) === -1){
                            tweets[turl].push(s_tweet);
                            let th_kw = THandlers.filter((d,i) => d.url === turl)[0].keywords.split(',');
                            let th_name = THandlers.filter((d,i) => d.url === turl)[0].name;
                            th_kw.forEach((kw,j) => {
                                if(kw === '*'){
                                    N.push({
                                        tweet:s_tweet,
                                        name:th_name,
                                        link:l_tweet
                                    });
                                }
                                else{
                                   if(s_tweet.indexOf(kw) != -1){
                                        N.push({
                                            tweet:s_tweet,
                                            name:th_name,
                                            link:l_tweet
                                        });
                                    }
                                }
                            });
                        }
                    }
                }           
                 
            } catch (e) {
                  console.log('Error =>' + e);
            }
        });
    }, function(err, results){
            //console.log(results);
    });
},3*1000);//RUNS EVERY 5 SECONDS

setInterval(() => {
    if(N.length){
        let n = N.shift();
        console.log(n.link);
        notifier.notify({title: n.name,message: n.tweet,sound: true},
          function(err, response) {
            // Response is response from notification
          }
        );
    }
},500);