module.exports = function(){
  var route = require('express').Router()
  var conn = require('../../config/mysql/db')()
  //HOME
  route.get('/', function(req, res){
  	res.render('topic/home', {user:req.user})
  })

  // LIST
  route.get(['/list', '/list/:id'], function(req, res){
  	var sql = 'SELECT title,id FROM dataTbl'
  	conn.query(sql, function(err, results, fields){
  		if(err){
  			console.log(err)
  			res.send('Internal Server Error')
  		} else {
  			var id = req.params.id
  			if(id){
  				var sql = 'SELECT * FROM dataTbl WHERE id=?'
  				conn.query(sql, [id], function(err, result, fields){
  					if(err){
  						res.status(500).send('Internal Server Error')
              			console.log(err)
  					}else{
  						res.render('topic/list', {topics:results, topic:result[0]}) // /list/:id
  					}
  				})
  			} else {
  				res.render('topic/list', {topics:results}) // /list
  			}
  		}
  	})
  })

  // ADD
  route.get('/add', function(req, res){
  	res.render('topic/add', {user:req.user})
  })

  route.post('/add', function(req, res){
      var title = req.body.title
      var description = req.body.description
      var author = req.body.author
      var sql = 'INSERT INTO dataTbl (title, description, author) VALUES(?,?,?)'
      conn.query(sql, [title, description, author], function(err, result, fields){
          if(err){
      		res.status(500).send('Internal Server Error')
             	console.log(err)
          } else {
              res.redirect('/topic/list/'+result.insertId)
              console.log(result)
          }
      })
  })

  //DELETE
  route.get('/list/:id/delete', function(req, res){
      var id = req.params.id

      var sql = 'SELECT id, title FROM dataTbl WHERE id=?'
      conn.query(sql, [id],function(err, results, fields){
          res.render('topic/delete', {topic: results[0], user:req.user})
      })
  })

  route.post('/list/:id/delete', function(req, res){
  	var id = req.params.id
  	var sql = 'DELETE FROM dataTbl WHERE id=?'
  	conn.query(sql, [id], function(err, results, fields){
  		res.redirect('/topic/list')
  	})
  })

  //EDIT
  route.get('/list/:id/edit', function(req, res){
      var id = req.params.id
      var sql = 'SELECT * FROM dataTbl WHERE id=?'
      conn.query(sql, [id],function(err, results, fields){
          res.render('topic/edit', {topic: results[0], user:req.user})
      })
  })

  route.post('/list/:id/edit', function(req, res){
  	var id = req.params.id
  	var title = req.body.title
  	var description = req.body.description
  	var author = req.body.author

  	var sql = 'UPDATE dataTbl SET title=?, description=?, author=? WHERE id=?'
  	conn.query(sql, [title, description, author,id], function(err, results, fields){
  		res.redirect('/topic/list')
  	})
  })
  return route
}
