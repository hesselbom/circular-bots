module.exports = class CirclingBot {
  name () {
    return 'Circling Bot'
  }
  color () {
    return 'black'
  }
  image () {
    return 'https://robohash.org/circlingbot'
  }
  bulletColor () {
    return 'black'
  }
  mineColor () {
    return 'black'
  }
  update (me, bots, bullets, mines) {
    let v = new Vector2(me.pos).rotateDeg(90)

    if (me.reload <= 0) return Mine

    return Move(v.x, v.y)
  }
}
