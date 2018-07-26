var express = require('express')
var session = require('express-session')
var bodyParser = require('body-parser') //post 방식으로 req데이터 파싱시 필요
var mySQLStore = require('express-mysql-session')(session)
var pbkdf2Password = require('pbkdf2-password')
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy
var FacebookStrategy = require('passport-facebook').Strategy
var mysql = require('mysql')
var conn = mysql.createConnection({
    host : 'localhost',
    user : 'root',
    port: 3306,
    password : 'ehd4qkd',
    database : 'testAuthDB'
})

conn.connect()

var hasher = pbkdf2Password()
var app = express()

app.set('views', 'views')

app.use(bodyParser.urlencoded({ extended: false }))

app.use(session({
  secret: 'DSOIFN%@yG2GAsad1Fdf!fa1G%$', //사용자의 웹브라우저에 쿠키를 심을때 평문으로 심지 않고 랜덤한 값을 넣어줌
  resave: false, //그냥 false로 설정 (권장값)
  saveUninitialized: true, //그냥 true로 설정 (권장값)
  store:new mySQLStore({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'ehd4qkd',
    database: 'testAuthDB'
  })
}))

//이거 전에 먼저 DB세션에 대한 use 설정 코드 모두 넣어야함
//passport 등록
app.use(passport.initialize()) // passport 초기화
app.use(passport.session()) // passport를 이용해 인증할 때 세션사용

/* 홈 */
app.get('/home', function(req, res){
  // passport는 원래 객체에 있지 않은 user라는 객체를 만들어 user정보를 담는다
  if(req.user && req.user.displayName){ //로그인 상태
    var html=`
    <h1>Welcome ${req.user.displayName}</h1>
      <p>
        <label>email:</label>
      ${req.user.email}
      </p>
    <a href="/auth/logout">Logout</a>
    `
  } else { //로그아웃 상태
    var html=`
    <h1>Welcome</h1>
    <p>
    <a href="/auth/login">Login</a>
    </p>
    <p>
    <a href="/auth/register">Sign Up</a>
    </p>
    `
  }
  res.send(html)
})

/* 로그인 */
app.get('/auth/login', function(req, res){
  var html = `
  <h1>Login</h1>
  <form action="/auth/login" method="post">
  <p>
      <label>Username:</label>
      <input type="text" name="username"/>
  </p>
  <p>
      <label>Password:</label>
      <input type="password" name="password"/>
  </p>
  <p>
    <input type="submit" value="Log In"/>
  </p>
  </form>
  <a href="/auth/facebook">facebook</a>
  `
  res.send(html)
})

// done의 두번째 parameter가 false가 아니라면 call back으로실행
// 세션이 등록이 안된 경우 최초 등록
passport.serializeUser(function(user, done) {
  console.log('serializeUser ', user)
  done(null, user.authId) //이 식별자 정보만 세션에 저장됨
})

// 한번 세션 등록되면 deserializeUser함수 호출됨
// id값으로 위의 serializeUser함수의 두번째 인자(user.username)를 받음
passport.deserializeUser(function(id, done) {
  console.log('deserializeUser ', id)
  var sql = 'SELECT * FROM userTbl WHERE authId=?'
  conn.query(sql, [id], function(err, results){
    if(err){
      console.log(err)
      done('err msg: There is no user') //done의 첫 번째 인자는 에러메시지
    } else {
      return done(null, results[0]) //이 유저 값이 req의 user객체가 됨
    }
  })
})

////////////////////////////////////////////////////////////////////
// 정리 ////////////////////////////////////////////////////////////
// 1. LocalStrategy호출되며 로그인 성공시
// 2. serializeUser를 콜백 호출, 세션 식별자 정보 등록
// 3. deserializeUser 콜백 호출, 이때부턴 세션 있는경우 세션등록되있으면 이 함수만 호출됨
////////////////////////////////////////////////////////////////////
passport.use(new LocalStrategy( //local 로그인 전략 설정
  function(username, password, done){ //여기의 done과 위의 done은 다르다 !!!
    var i_username = username
    var i_password = password
    var sql = 'SELECT * FROM userTbl WHERE authId=?'
    conn.query(sql, ['local:'+i_username], function(err, results){
      if(err){
        return done('There is no user.')
      } else {
        var user = results[0]
        return hasher({password:i_password, salt:user.salt}, function(err, pass, salt, hash){
          console.log(hash)
          if(hash === user.password){ // 로그인 성공 시
            console.log('LocalStrategy ', user)
            done(null, user) //로그인 성공
          } else {
            done(null, false) // 로그인 실패
          }
        })
      }
    })
  }
))

passport.use(new FacebookStrategy({
    clientID: '517337582032196',
    clientSecret: '81e4ec52387ce3e8a29d2bbac4a15633',
    callbackURL: '/auth/facebook/callback',
    profileFields:['id', 'email', 'gender', 'link', 'locale',
    'name', 'timezone', 'updated_time', 'verified', 'displayName']
  },
  function(accessToken, refreshToken, profile, done) {
    //console.log(profile)
    var authId = 'facebook:'+profile.id
    var sql = 'SELECT * FROM userTbl WHERE authId=?'
    conn.query(sql, [authId], function(err, results){
      if(err){
        console.log(err)
        done('err')
      } else if(results.length>0){ // 등록 사용자 존재 한다면
        done(null, results[0])
      } else { // 등록 사용자 없다면 새로 등록
        var newUser = {
          'authId' : authId,
          'displayName' : profile.displayName, //displayName은 어떤형식으로 가입,로그인 했든 공통 식별자
          'email' : profile.emails[0].value
        }
        var sql2 = 'INSERT INTO userTbl SET ?'
        conn.query(sql2, newUser, function(err, results){
          if(err){
            console.log(err)
            done('err')
          } else {
            done(null, newUser)
          }
        })
      }
    })
  })
)

app.post('/auth/login',
  passport.authenticate('local', // 인증 strategy 설정 (local 방식의 로그인)
    { successRedirect: '/home', //성공시 redirect
      failureRedirect: '/auth/login', //실패시 redirect
      failureFlash: false } //사용자 알림 msg (eg. 인증에 실패 했습니다.)
    )
)

app.get('/auth/facebook', //페이스북 인증화면으로 자동 redirection
  passport.authenticate('facebook',
  {scope:'email'}) //facebook에서 얻을 수 있는 정보. 사용자의 권한이 필요함
)

app.get('/auth/facebook/callback', // 인증후 콜백, 사용자에 대한 구체적 정보 얻음
  passport.authenticate('facebook',
  { successRedirect: '/home',
    failureRedirect: '/auth/login' }
))

/* 로그아웃 */
app.get('/auth/logout', function(req, res){
  req.logout()
  req.session.save(function(){
    res.redirect('/home')
  })
})

/* 회원가입 */
app.get('/auth/register', function(req, res){
  var html = `
    <h1>Register</h1>
    <form action="/auth/register" method="post">
      <p>
        <input type="text" name="username" placeholder="username"/>
      </p>
      <p>
        <input type="password" name="password" placeholder="password"/>
      </p>
      <p>
        <input type="text" name="displayName" placeholder="display name"/>
      </p>
      <p>
        <input type="text" name="email" placeholder="email"/>
      </p>
      <p>
        <input type="submit" value="Sign Up"/>
      </p>
    </form>
  `
  res.send(html)
})

app.post('/auth/register', function(req, res){
  var newUsername = req.body.username
  var newPassword = req.body.password
  var newDisplayName = req.body.displayName
  var newEmail = req.body.email

  hasher({password:newPassword}, function(err, pass, salt, hash){
    var newUser = {
      authId : 'local:' + newUsername,
      username : newUsername,
      password : hash,
      salt : salt,
      displayName : newDisplayName,
      email : newEmail
    }
    var sql = 'INSERT INTO userTbl SET ?'
    conn.query(sql, newUser, function(err, results){
      if(err){
        console.log(err)
        res.status(500)
      } else {
        req.login(newUser, function(err){
          req.session.save(function(){
            res.redirect('/home')
          }) //save
        }) //login
      }
    })
  }) //hasher
}) //post


app.listen(3000, function(){
  console.log('3000 port connected.')
})
