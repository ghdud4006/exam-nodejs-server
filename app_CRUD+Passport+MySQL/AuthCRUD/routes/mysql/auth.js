module.exports = function(passport){
  var route = require('express').Router()
  var pbkdf2Password = require('pbkdf2-password')
  var hasher = pbkdf2Password()
  var conn = require('../../config/mysql/db')()
  /* 로그인 */
  route.get('/login', function(req, res){
    res.render('auth/login')
  })

  route.post('/login',
    passport.authenticate('local', // 인증 strategy 설정 (local 방식의 로그인)
      { successRedirect: '/topic', //성공시 redirect
        failureRedirect: '/auth/login', //실패시 redirect
        failureFlash: false } //사용자 알림 msg (eg. 인증에 실패 했습니다.)
      )
  )

  route.get('/facebook', //페이스북 인증화면으로 자동 redirection
    passport.authenticate('facebook',
    {scope:'email'}) //facebook에서 얻을 수 있는 정보. 사용자의 권한이 필요함
  )

  route.get('/facebook/callback', // 인증후 콜백, 사용자에 대한 구체적 정보 얻음
    passport.authenticate('facebook',
    { successRedirect: '/topic',
      failureRedirect: '/auth/login' }
  ))

  /* 로그아웃 */
  route.get('/logout', function(req, res){
    req.logout()
    req.session.save(function(){
      res.redirect('/topic')
    })
  })

  /* 회원가입 */
  route.get('/register', function(req, res){
    res.render('auth/register')
  })

  route.post('/register', function(req, res){
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
              res.redirect('/topic')
            }) //save
          }) //login
        }
      })
    }) //hasher
  }) //post
  return route
}
