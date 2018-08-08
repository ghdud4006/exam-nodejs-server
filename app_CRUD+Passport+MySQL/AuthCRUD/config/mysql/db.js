module.exports = function(){
  var mysql = require('mysql')
  var conn = mysql.createConnection({
      host : 'localhost',
      user : 'root',
      port: 3306,
      password : 'ehd4qkd',
      database : 'AuthCrudDB'
  })

  conn.connect()
  return conn
}
