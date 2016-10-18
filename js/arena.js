const arenaRadius = 320
const blockRadius = 64
const botRadius = 16
const bulletRadius = 4
const mineRadius = 4

exports.arenaRadius = arenaRadius
exports.blockRadius = blockRadius
exports.botRadius = botRadius
exports.bulletRadius = bulletRadius

exports.contain = (v) =>
  (v.length() > arenaRadius - botRadius) ? v.normalize().scale(arenaRadius - botRadius)
  : (v.length() < blockRadius + botRadius) ? v.normalize().scale(blockRadius + botRadius)
  : v

exports.insideBounds = (v, radius) =>
  v.length() + radius > arenaRadius || v.length() - radius < blockRadius

exports.bulletHit = (bullet, bot) =>
  bullet.pos.distance(bot.pos) < bulletRadius + botRadius

exports.mineHit = (mine, bot) =>
  mine.pos.distance(bot.pos) < mineRadius + botRadius

exports.botsHit = (b1, b2) =>
  b1.pos.distanceSq(b2.pos) < (botRadius * 2) * (botRadius * 2)

exports.resolveBotHit = (b1, b2) => {
  let dist = b1.pos.distance(b2.pos)
  let diff = b1.pos.clone().sub(b2.pos).normalize().scale(botRadius - dist / 2)
  b1.pos.add(diff)
  b2.pos.sub(diff)
}
