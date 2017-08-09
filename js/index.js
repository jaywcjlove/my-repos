(function(){


//简单模版
function simple(str,obj){
    return str.replace(/\$\w+\$/gi, function(matchs) {
        var returns = obj[matchs.replace(/\$/g, "")];
        return typeof returns === "undefined" ? "" : returns;
    })
}
// 添加Query
function appendQuery(url, query) {
    if (query == '') return url
    return (url + '&' + query).replace(/[&?]{1,2}/, '?')
}

//获取URL上面的参数
function getQueryString(url,name) { 
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(url);  
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));  
}

var ghRepos = function(username,token){
    token = token?'access_token='+token:'';
    this.username = username || ''
    this.repos_url = 'https://api.github.com/search/repositories?'+token+'&q=user:'+username;
    this.starred_url = 'https://api.github.com/users/'+username+'/starred?'+token;
    this.users_url = 'https://api.github.com/users/'+username+'?'+token;
    this.reposLayElm= this.E('repos-layout');
    this.repos_count_elm = this.E('repos_count');
    this.repos_followers_elm = this.E('repos_followers');
    this.repos_starred_elm = this.E('repos_starred');
    this.repos_star_elm = this.E('repos_star_total');
    this.repos_following_elm = this.E('repos_following');
    this.avatar_elm = this.E('avatar');
    this.nickname_elm = this.E('nickname');
    this.repos_count = 0
    this.repos_starred_array = []
    this.repos_array =[]
    this.repos_stargazers_count = 0; // 星星的数量
    this.init();

    this.avatar_elm.href = 'https://github.com/'+self.username
    this.repos_followers_elm.href= 'https://github.com/'+self.username+'/followers'
    this.repos_following_elm.href= 'https://github.com/'+self.username+'/following'
    this.repos_starred_elm.href= 'https://github.com/stars/'+self.username
    this.repos_count_elm.href= 'https://github.com/'+self.username+'?tab=repositories'
}

ghRepos.prototype = {
    E:function(name){return document.getElementById(name); },
    JSONP:function(url,callback){
        var script = document.createElement('script'),
            callbackName = getQueryString(url, 'callback'),
            originalCallback = window[callbackName],
            responseData;
            this.bindEvent(script,'load',function(e){
                // console.log(responseData)
                callback&&responseData&&(callback(responseData[0],e))
                script.remove()
            })
            this.bindEvent(script,'error',function(e){
                if (e.type == 'error' || !responseData) {
                    callback&&(callback(null,e))
                }
                script.remove()
            })
            //插入script 获取返回的数据
            window[callbackName] = function(){responseData = arguments}
            script.src = url.replace(/\?(.+)=\?/, '?$1=' + callbackName)
            document.head.appendChild(script)

    },
    createRepos:function(item){

        var item_html ='<li> <div class="card-item"> <h3 class="name"><a href="$html_url$">$name$</a></h3> <span class="language">$language$</span> <div class="repos"> <span><a href="$stargazers_url$">Star<i>$stargazers_count$</i></a></span> <span><a href="$forks_url$">fork<i>$forks$</i></a></span> $homepage$ </div> <p class="des">$description$</p> </div> </li>';

        var html_str = '';

        this.repos_count = item.length;
        for (var i = 0; i < item.length; i++) {
            html_str += simple(item_html,{
                name:item[i].name,
                html_url:item[i].html_url,
                language:item[i].language||'',
                forks:item[i].forks,
                forks_url:'https://github.com/'+item[i].full_name+'/network/members' ,
                description:item[i].description||'-',
                homepage:(function(){
                    return item[i].homepage 
                        ? '<span><a href="'+item[i].homepage+'" class="home">Home</a></span>'
                        :'';
                })(),
                stargazers_count:item[i].stargazers_count,
                stargazers_url:'https://github.com/'+item[i].full_name+'/stargazers',
                watchers:item[i].watchers
            })
        }
        this.reposLayElm.innerHTML = html_str;
    },
    bindEvent:function(elm,type,handle){
        if (elm.addEventListener) {
            elm.addEventListener(type, handle, false); 
        } else if (elm.attachEvent)  {
            elm.attachEvent('on'+type, handle);
        }
    },
    getStargazersCount:function(items){
        for(var i =0 ;i< items.length;i++){
            this.repos_stargazers_count +=items[i].stargazers_count;
        }
    },
    getReposData:function(url,num){
        var self = this;
        this.JSONP(url+'&page='+num,function(dt,e){
            var items = dt.data.items;num++;
            if(e&&e.type !== 'error'&&items&&items.length>0){
                self.repos_array= self.repos_array.concat(items)
                self.createRepos(self.repos_array);
                self.getReposData(url,num);
                self.getStargazersCount(items);
            }else{
                self.repos_count_elm.children[0].innerHTML = self.repos_array.length;
                self.repos_star_elm.children[0].innerHTML = self.repos_stargazers_count;
            }
        })

    },
    getReposStarred:function(url,num){
        var self = this;
        this.JSONP(url+'&page='+num,function(dt,e){
            var items = dt.data;num++;
            if(e&&e.type !== 'error'&&items.length>0){
                self.repos_starred_array = self.repos_starred_array.concat(items)
                self.getReposStarred(url,num)
            }else{
                self.repos_starred_elm.children[0].innerHTML = self.repos_starred_array.length
            }
        })
    },
    init:function(){
        var num=1;self = this;
        this.repos_url = appendQuery(this.repos_url,'callback=jsonp'+Date.now()+(num++))
        this.users_url = appendQuery(this.users_url,'callback=jsonp'+Date.now()+(num++))
        this.starred_url = appendQuery(this.starred_url,'callback=jsonp'+Date.now()+(num++))
        this.getReposStarred(this.starred_url,1)
        this.JSONP(this.users_url,function(dt,e){
            if(e&&e.type !== 'error'){
                dt.data.followers&&(self.repos_followers_elm.children[0].innerHTML = dt.data.followers)
                dt.data.following&&(self.repos_following_elm.children[0].innerHTML = dt.data.following)

                if(dt.data&&dt.data.avatar_url&&dt.data.name){
                    self.avatar_elm.innerHTML= '<img src="'+dt.data.avatar_url+'" alt="'+dt.data.name+'的头像">' 
                    self.nickname_elm.innerHTML= '<a href="'+dt.data.html_url+'" title="'+dt.data.name+'">'+dt.data.name+'</a>' 

                }
            }
        })
        this.getReposData(this.repos_url,1)
    }
}

new ghRepos('jaywcjlove','')

})()