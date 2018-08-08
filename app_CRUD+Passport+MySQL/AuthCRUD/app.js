const PORT = 3000

var app = require('./config/mysql/express')()
var passport = require('./config/mysql/passport')(app)
var auth = require('./routes/mysql/auth')(passport)
app.use('/auth/', auth)

var topic = require('./routes/mysql/topic')()
app.use('/topic', topic)

// LISTNER
app.listen(PORT, function(){
	console.log('Connected, '+PORT+' PORT !')
})
