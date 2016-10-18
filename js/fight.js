const Vector2 = require('vector2-node')
const botHelper = require('./botHelper')
const constants = require('./constants')
const arena = require('./arena')

let tickActions = (wrappers, bullets, mines) => {
  let actions = []
  let currentWrappers = wrappers.filter(b => !!b).map(b => botHelper.safeBot(b))
  let currentBullets = bullets.filter(b => !!b).map(b => botHelper.safeBullet(b))
  let currentMines = mines.filter(m => !!m).map(m => botHelper.safeMine(m))

  wrappers.forEach((b, i) => {
    if (b.health > 0) {
      let clonedWrappers = currentWrappers.map(b => botHelper.cloneSafeBot(b))
      let clonedBullets = currentBullets.map(b => botHelper.cloneSafeBullet(b))
      let clonedMines = currentMines.map(b => botHelper.cloneSafeMine(b))
      let attempted = b.bot.update(clonedWrappers[i], clonedWrappers, clonedBullets, clonedMines)

      switch (attempted && attempted.id) {
        case constants.MOVE:
          let attemptedPos = b.pos.clone().add(attempted.value)
          b.pos = arena.contain(attemptedPos.clone())
          break

        case constants.SHOOT:
          if (b.reload <= 0) {
            let vel = attempted.value.clone().scale(constants.BULLET_SPEED)
            let pos = b.pos.clone().add(attempted.value.clone().scale(arena.botRadius + arena.bulletRadius))
            let bullet = { pos: pos, vel: vel, botid: b.id, justcreated: true }
            let color = b.bot.bulletColor && b.bot.bulletColor()

            bullets.push(bullet)
            bullet.id = bullets.length - 1
            actions.push({ id: constants.SHOOT, bulletid: bullet.id, pos: { x: pos.x, y: pos.y }, color: color })

            b.reload = constants.RELOAD_FRAMES
          }
          break

        case constants.MINE:
          if (b.reload <= 0) {
            let pos = b.pos.clone()
            let mine = { pos: pos, botid: b.id }
            let color = b.bot.mineColor && b.bot.mineColor()

            mines.push(mine)
            mine.id = mines.length - 1
            actions.push({ id: constants.MINE, mineid: mine.id, pos: { x: pos.x, y: pos.y }, color: color })

            b.reload = constants.RELOAD_FRAMES
          }
          break
      }
    }
  })

  // Resolve bot collisions on moves
  wrappers.forEach(b1 => {
    if (b1.health <= 0) return
    wrappers.forEach(b2 => {
      if (b2.health > 0 && b1.id !== b2.id && arena.botsHit(b1, b2)) {
        arena.resolveBotHit(b1, b2)
      }
    })
  })
  wrappers.forEach(b => {
    if (b.health > 0) actions.push({ id: constants.MOVE, botid: b.id, pos: { x: b.pos.x, y: b.pos.y } })
  })

  return actions
}

let tickBullets = (wrappers, bullets) => {
  let actions = []
  bullets.forEach((b, i) => {
    if (b) {
      if (!b.justcreated) {
        b.pos.add(b.vel)
        actions.push({ id: constants.MOVE_BULLET, bulletid: i, pos: { x: b.pos.x, y: b.pos.y } })
      }
      if (arena.insideBounds(b.pos, arena.bulletRadius)) {
        b.dead = true
        bullets[i] = null
        actions.push({ id: constants.KILL_BULLET, bulletid: i })
      } else {
        wrappers.forEach(w => {
          if (!b.dead && w.id !== b.botid && w.health > 0 && arena.bulletHit(b, w)) {
            b.dead = true
            bullets[i] = null
            actions.push({ id: constants.KILL_BULLET, bulletid: i })

            w.health -= 1
            actions.push({ id: constants.HIT_BOT, botid: w.id, health: w.health })

            if (w.health <= 0) {
              actions.push({ id: constants.KILL_BOT, botid: w.id })
            }
          }
        })
      }
      b.justcreated = false
    }
  })
  return actions
}

let tickMines = (wrappers, mines) => {
  let actions = []
  mines.forEach((b, i) => {
    if (b) {
      wrappers.forEach(w => {
        if (!b.dead && w.id !== b.botid && w.health > 0 && arena.mineHit(b, w)) {
          b.dead = true
          mines[i] = null
          actions.push({ id: constants.KILL_MINE, mineid: i })

          w.health -= 1
          actions.push({ id: constants.HIT_BOT, botid: w.id, health: w.health })

          if (w.health <= 0) {
            actions.push({ id: constants.KILL_BOT, botid: w.id })
          }
        }
      })
    }
  })
  return actions
}

let isGameOver = (wrappers, game) => {
  let botsAlive = wrappers.reduce((num, b) => num + (b.health > 0 ? 1 : 0), 0)
  if (botsAlive <= 1) {
    game.over = true
    if (botsAlive === 1) {
      let b = wrappers.find(w => w.health > 0)
      return [{ id: constants.GAME_OVER, winner: botHelper.safeBot(b) }]
    }
    return [{ id: constants.GAME_OVER, winner: null }]
  }
  return []
}

let tick = (wrappers, bullets, mines, game) => {
  wrappers.forEach(b => b.reload--)

  let actions = []

  actions = actions.concat(tickActions(wrappers, bullets, mines))
  actions = actions.concat(tickBullets(wrappers, bullets))
  actions = actions.concat(tickMines(wrappers, mines))
  actions = actions.concat(isGameOver(wrappers, game))

  return actions
}

exports.simulate = bots => {
  let game = { over: false }
  let ticks = []
  let pos = (i) =>
    new Vector2(arena.blockRadius + (arena.arenaRadius - arena.blockRadius) / 2, 0)
      .rotate((Math.PI * 2 / bots.length) * i)

  let bullets = []
  let mines = []
  let wrappers = bots.map((b, i) => ({
    id: i,
    pos: pos(i),
    bot: b,
    reload: 0,
    health: constants.MAX_HEALTH
  }))
  let outputBots = wrappers.map(b => ({
    id: b.id,
    name: botHelper.botName(b.bot),
    color: b.bot.color && b.bot.color(),
    image: b.bot.image && b.bot.image(),
    bulletColor: b.bot.bulletColor && b.bot.bulletColor(),
    pos: { x: b.pos.x, y: b.pos.y }
  }))

  for (let tuce = 0; tuce < constants.MAX_TICKS; tuce++) {
    if (!game.over) ticks.push(tick(wrappers, bullets, mines, game))
  }

  if (!game.over) ticks.push([{ id: constants.GAME_OVER, winner: null }])

  return {
    ticks: ticks,
    bots: outputBots
  }
}
