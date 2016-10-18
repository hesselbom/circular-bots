const path = require('path')
const fs = require('fs')
const vm = require('vm')
const Vector2 = require('vector2-node')
const needle = require('needle')
const constants = require('./constants')
const lzstring = require('lz-string')
const m = require('module')

let enumify = (id, value) => ({ id: id, value: value })

exports.parse = files =>
  exports.getBots(files).map(b => (
    {
      name: exports.botName(b),
      file: path.basename(b.constructor.file, '.js')
    }
  ))

exports.runBot = (src, file) => {
  let _module = {}
  vm.runInNewContext(m.wrap(src), {
    console: console,
    Vector2: Vector2,
    DoNothing: enumify(constants.DO_NOTHING),
    Move: (x, y) => {
      let v = new Vector2(x, y)
      if (v.length() > 1) v.normalize()
      return enumify(constants.MOVE, v)
    },
    Shoot: (x, y) => enumify(constants.SHOOT, new Vector2(x, y).normalize()),
    Mine: enumify(constants.MINE)
  })({}, require, _module, __filename, __dirname)
  let Bot = _module.exports
  Bot.file = file
  return new Bot()
}

exports.getBots = (files, remote, cb) => {
  let remoteCount = files.filter(b => b.indexOf('remote:') === 0).length
  let bots = files.map((file, i) => {
    if (file.indexOf('remote:') === 0) {
      let key = file.substr('remote:'.length)
      needle.get(remote + '/bot?key=' + key, (err, response) => {
        if (!err && response) {
          let code = lzstring.decompressFromUTF16(response.body)
          bots[i] = exports.runBot(code, key)
        }
        if (--remoteCount === 0) cb(bots)
      })
      return null
    } else {
      let src = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
      return exports.runBot(src, file)
    }
  })

  if (!remote) return bots
  if (remoteCount === 0) cb(bots)
}

exports.botName = b => (b.name && b.name()) || b.constructor.name

exports.safeBot = wrapper => ({
  name: exports.botName(wrapper.bot),
  color: wrapper.bot.color && wrapper.bot.color(),
  image: wrapper.bot.image && wrapper.bot.image(),
  bulletColor: wrapper.bot.bulletColor && wrapper.bot.bulletColor(),
  mineColor: wrapper.bot.mineColor && wrapper.bot.mineColor(),
  pos: wrapper.pos.clone(),
  reload: wrapper.reload,
  health: wrapper.health,
  id: wrapper.id
})

exports.cloneSafeBot = b => ({
  name: b.name,
  color: b.color,
  image: b.image,
  bulletColor: b.bulletColor,
  mineColor: b.mineColor,
  pos: b.pos.clone(),
  reload: b.reload,
  health: b.health,
  id: b.id
})

exports.safeBullet = b => ({
  pos: b.pos.clone(),
  vel: b.vel.clone(),
  botid: b.botid,
  id: b.id
})

exports.cloneSafeBullet = b => ({
  pos: b.pos.clone(),
  vel: b.vel.clone(),
  botid: b.botid,
  id: b.id
})

exports.safeMine = m => ({
  pos: m.pos.clone(),
  botid: m.botid,
  id: m.id
})

exports.cloneSafeMine = m => ({
  pos: m.pos.clone(),
  botid: m.botid,
  id: m.id
})
