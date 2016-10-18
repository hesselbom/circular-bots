const port = 1337
// const remote = 'http://localhost:1338'
const remote = 'http://circularbots.hesselbom.net'
const babeloptions = {
  presets: ['es2015']
}

const fs = require('fs')
const glob = require('glob')
const sass = require('node-sass-middleware')
const sassGlob = require('node-sass-globbing')
const express = require('express')
const path = require('path')
const babel = require('babel-core')
const mkdirp = require('mkdirp')
const browserify = require('browserify')
const lzstring = require('lz-string')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const moment = require('moment')
const needle = require('needle')
const uglifyjs = require('uglify-js')
const extend = require('extend')

const botHelper = require('./js/botHelper')
const fight = require('./js/fight')

let formatDate = s => moment(s).format('D MMM YYYY HH:mm')

let app = express()

app.set('view engine', 'pug')
app.use(
  sass({
    src: path.join(__dirname, 'sass'),
    dest: path.join(__dirname, 'public'),
    debug: false,
    prefix: '/public',
    indentedSyntax: true,
    importer: sassGlob,
    includePaths: [
      './node_modules/normalize-scss/sass'
    ]
  })
)
app.use(cookieParser())
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))
app.use('/public', express.static(path.join(__dirname, 'public')))
app.use(express.static(path.join(__dirname, 'favicons')))

app.get('/', (req, res) => {
  res.render('index')
})

app.get('/logout', (req, res) => res.clearCookie('token').redirect('/'))

app.post('/login', (req, res) => {
  if (!req.body.username || !req.body.password) return res.status(400).send('No user or pass')

  needle.post(remote + '/login', {
    username: req.body.username,
    password: req.body.password
  }, (err, response) => {
    if (err || response.statusCode !== 200) return res.status(401).send('Could not login.')
    res.cookie('token', response.body, {
      expires: moment().add(1, 'years').toDate()
    }).redirect('/lobby')
  })
})

app.get('/register', (req, res) => {
  res.render('register')
})

app.post('/register', (req, res) => {
  if (!req.body.username || !req.body.password) return res.status(400).send('No user or pass')

  needle.post(remote + '/register', {
    username: req.body.username,
    password: req.body.password,
    signupkey: req.body.signupkey
  }, (err, response) => {
    if (err || response.statusCode !== 200) return res.status(401).send('Could not signup.')
    res.cookie('token', response.body, {
      expires: moment().add(1, 'years').toDate()
    }).redirect('/lobby')
  })
})

app.get('/lobby', (req, res) => {
  glob('./bots/*.js', [], (err, files) => {
    if (err) return res.status(500).send('Could not find bots')

    let querybots = req.query.bot ? [].concat(req.query.bot) : []
    let params = (bots) => bots.length > 0 ? '?' + bots.map(b => 'bot=' + b).join('&') : ''
    let roster = req.query.bot ? [].concat(req.query.bot).map(b =>
      b.indexOf('remote:') === 0
      ? { id: b, name: b.substr('remote:'.length), remote: true }
      : { id: b, name: b, remote: false }) : []
    let addBot = (name) => req.query.bot ? '/lobby' + params(querybots) + '&bot=' + name : '/lobby?bot=' + name
    let removeBot = (id) => {
      let bots = querybots.slice(0)
      let index = bots.indexOf(id)
      if (index >= 0) bots.splice(index, 1)
      return '/lobby' + params(bots)
    }
    let variables = {
      formatDate: formatDate,
      params: params,
      querybots: querybots,
      roster: roster,
      addBot: addBot,
      removeBot: removeBot,
      bots: botHelper.parse(files)
    }
    let notLoggedIn = () => res.render('lobby', extend({}, variables, {
      loggedin: false
    }))

    if (req.query.remote) {
      querybots.push('remote:' + req.query.remote)
      return res.redirect('/lobby' + params(querybots))
    }

    if (req.cookies.token) {
      needle.get(remote + '/me', {
        headers: { 'Authorization': 'Bearer ' + req.cookies.token }
      }, (err, response) => {
        if (err || response.statusCode !== 200) return notLoggedIn()
        res.render('lobby', extend({}, variables, {
          loggedin: true,
          storedBots: response.body.bots,
          storedFights: response.body.fights.sort((a, b) => a.date > b.date ? -1 : 1)
        }))
      })
    } else {
      notLoggedIn()
    }
  })
})

app.get('/fight', (req, res) => {
  if (!req.query.bot && !req.query.key) return res.status(400).send('No bots or key.')

  if (req.query.key) {
    needle.get(remote + '/fight?key=' + req.query.key, (err, response) => {
      if (err || response.statusCode !== 200) return res.status(404).send('Fight not found.')
      res.render('fight', {
        fight: response.body
      })
    })
  } else {
    let querybots = [].concat(req.query.bot)
    let files = querybots.map(b => b.indexOf('remote:') === 0 ? b : `./bots/${b}.js`)

    let render = (bots) => {
      try {
        res.render('fight', {
          fight: lzstring.compressToUTF16(JSON.stringify({
            fight: fight.simulate(bots)
          }))
        })
      } catch (e) {
        res.status(500).send('Something went wrong with your bots.')
        console.error(e)
      }
    }

    botHelper.getBots(files, remote, render)
  }
})

app.post('/storefight', (req, res) => {
  if (!req.body.fight) return res.status(400).send('No fight data.')

  needle.post(remote + '/fight', { fight: req.body.fight }, {
    headers: { 'Authorization': 'Bearer ' + req.cookies.token }
  }, (err, response) => {
    if (err || response.statusCode !== 200) return res.status(response.statusCode).send('Something went wrong.')
    res.render('storedfight', {
      key: response.body
    })
  })
})

app.get('/upload', (req, res) => {
  if (!req.query.key) return res.status(400).send('No key.')

  res.render('upload', { key: req.query.key })
})

app.post('/upload', (req, res) => {
  let key = req.body.key

  let file = path.join(__dirname, 'bots', key + '.js')
  let compiled = babel.transformFileSync(file, babeloptions)
  let bot = botHelper.runBot(compiled.code, file)
  let name = botHelper.botName(bot)

  let minified = uglifyjs.minify(compiled.code, {
    fromString: true,
    mangle: {
      except: [
        bot.constructor.name,
        'name',
        'color',
        'image',
        'bullets',
        'update'
      ]
    }
  })
  let code = lzstring.compressToUTF16(minified.code)

  needle.post(remote + '/bot', { name: name, bot: code }, {
    headers: { 'Authorization': 'Bearer ' + req.cookies.token }
  }, (err, response) => {
    if (err || response.statusCode !== 200) return res.redirect('/upload?key=' + key)
    res.redirect('/lobby')
  })
})

app.get('/delete', (req, res) => {
  if (!req.query.key) return res.status(400).send('No key.')

  res.render('delete', { key: req.query.key })
})

app.post('/delete', (req, res) => {
  let key = req.body.key

  needle.delete(remote + '/bot', { key: key }, {
    headers: { 'Authorization': 'Bearer ' + req.cookies.token }
  }, (err, response) => {
    if (err || response.statusCode !== 200) return res.redirect('/delete?key=' + key)
    res.redirect('/lobby')
  })
})

app.get('/app', (req, res) => {
  res.header('Content-Type', 'application/javascript')

  glob('./client/**/*.js', [], (err, files) => {
    if (err) return res.status(500).send()

    files.forEach(file => {
      let compiled = babel.transformFileSync(file, babeloptions)
      let tmpPath = path.join(__dirname, '.tmp', file.substr('./client/'.length))
      mkdirp.sync(path.dirname(tmpPath))
      fs.writeFileSync(tmpPath, compiled.code)
    })

    browserify([path.join(__dirname, './.tmp/app.js')]).bundle()
      .pipe(res)
  })
})

app.listen(port, () => {
  console.log(`RUNNING ON PORT ${port}!!!`)
})
