module.exports = function(app){
  var conn = require('./db')()
  var pbkdf2Password = require('pbkdf2-password')
  var passport = require('passport')
  var LocalStrategy = require('passport-local').Strategy
  var FacebookStrategy = require('passport-facebook').Strategy

  //이거 전에 먼저 DB세션에 대한 use 설정 코드 모두 넣어야함
  //passport 등록
  app.use(passport.initialize()) // passport 초기화
  app.use(passport.session()) // passport를 이용해 인증할 때 세션사용

  var hasher = pbkdf2Password()

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
          if(user){ //해당 유저 있는 경우
            return hasher({password:i_password, salt:user.salt}, function(err, pass, salt, hash){
              console.log(hash)
              if(hash === user.password){ // 로그인 성공 시
                console.log('LocalStrategy ', user)
                done(null, user) //로그인 성공
              } else {
                done(null, false) // 로그인 실패 (password 불일치)
              }
            })
          } else { // 해당 유저 없는 경우
            done(null, false) // 로그인 실패 (없는 id)
          }
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
  return passport
}
