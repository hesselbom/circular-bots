const $ = require('jquery')
const lzstring = require('lz-string')
const constants = require('../js/constants')
const fps = require('./fps')

const _fps = 60
let arena = () => $('.circular-arena')

let tick = (domBots, domBullets, domMines, actions, ticks) => {
  actions.forEach(action => {
    switch (action.id) {
      case constants.MOVE:
        position(domBots[action.botid], action.pos)
        break

      case constants.SHOOT:
        domBullets[action.bulletid] = createBullet(action.pos, action.color)
        break

      case constants.MINE:
        domMines[action.mineid] = createMine(action.pos, action.color)
        break

      case constants.MOVE_BULLET:
        position(domBullets[action.bulletid], action.pos)
        break

      case constants.KILL_BULLET:
        domBullets[action.bulletid].remove()
        delete domBullets[action.bulletid]
        break

      case constants.KILL_MINE:
        domMines[action.mineid].remove()
        delete domMines[action.mineid]
        break

      case constants.KILL_BOT:
        domBots[action.botid].remove()
        delete domBots[action.botid]
        break

      case constants.HIT_BOT:
        domBots[action.botid]
          .removeClass('-health20 -health40 -health60 -health80')
          .addClass(`-health${action.health * 20}`)
        break

      case constants.GAME_OVER:
        let msg = action.winner ? `${action.winner.name} won` : 'Draw'
        $('<div class="winner-text">').append(`<p>${msg}<br/><a href="/lobby">Back</a></p>`).appendTo('body')
        break
    }
  })

  let seconds = Math.floor((constants.MAX_TICKS - ticks) / _fps)
  let minutes = Math.floor(seconds / 60)
  $('.counter').text(minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds % 60}s`)
}

let position = ($b, pos) =>
  $b.css('transform', `translate(${pos.x}px, ${pos.y}px)`)

let createBots = (bots) => {
  let o = {}

  bots.forEach(b => {
    let $bot = $('<span class="bot">').appendTo(arena())
    let $graphic = $('<span class="graphic">').appendTo($bot)
    if (b.color) $graphic.css('background-color', b.color)
    if (b.image) $graphic.css('background-image', `url(${b.image})`)
    position($bot, b.pos)
    o[b.id] = $bot
  })

  return o
}

let createBullet = (pos, color) => {
  let $b = $('<span class="bullet">').appendTo(arena())
  position($b, pos)
  if (color) $b.css('background-color', color)
  return $b
}

let createMine = (pos, color) => {
  let $b = $('<span class="mine">').appendTo(arena())
  position($b, pos)
  if (color) $b.css('background-color', color)
  return $b
}

let render = code => {
  let fight = JSON.parse(lzstring.decompressFromUTF16(code)).fight
  let domBots = createBots(fight.bots)
  let domBullets = {}
  let domMines = {}
  let ticks = 0
  fps.start(_fps, () => fight.ticks.length > 0 ? tick(domBots, domBullets, domMines, fight.ticks.shift(), ticks++) : false)
}

window.play = () => {
  let overlay = document.getElementById('overlay')
  overlay.parentNode.removeChild(overlay)
  render(document.getElementById('fight').innerHTML)
}
