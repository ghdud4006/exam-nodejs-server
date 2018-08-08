module.exports = function(){
  //// APP SETTING
  var express = require('express')
  var session = require('express-session')
  var bodyParser = require('body-parser') //post 방식으로 req데이터 파싱시 필요
  var mySQLStore = require('express-mysql-session')(session)

  var app = express()

  app.set('view engine', 'jade')
  app.set('views', './views/mysql')
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(express.static('public'))
  app.locals.pretty=true

  // session setting
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
  return app
}
