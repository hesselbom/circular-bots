module.exports = class SimpleBot {
  constructor () {
  }
  name () {
    return 'SimpleBot'
  }
  color () {
    return 'green'
  }
  image () {
    return 'https://robohash.org/abc'
  }
  bulletColor () {
    return '#0000ff'
  }
  mineColor () {
    return 'red'
  }
  // update is called every frame
  // Return an action for your bot to do
  //
  // me: BotData
  // bots: [BotData]
  // bullets: [BulletData]
  // mines: [MineData]
  //
  // BotData:
  //   name: string
  //   color: string
  //   image: string
  //   bulletColor: string
  //   mineColor: string
  //   pos: Vector2
  //   reload: int
  //   health: int
  //   id: int
  //
  // BulletData:
  //   pos: Vector2
  //   vel: Vector2
  //   botid: int
  //   id: int
  //
  // MineData:
  //   pos: Vector2
  //   botid: int
  //   id: int
  //
  // Available global variables:
  //   Vector2: http://rahatah.me/vector2-node
  //   console.log
  update (me, bots, bullets, mines) {
    if (me.reload <= 0) {
      if (me.pos.y < 200) return Mine
      else return Shoot(me.pos.x < 0 ? 1 : -1, 0)
    }

    if (me.pos.y < 200) return Move(0, me.pos.x > 0 ? 0.9 : 1)
    else return Shoot(me.pos.x < 0 ? 1 : -1, 0)

    // Possible return values:
    // return DoNothing
    // return Move(x, y)
    // return Shoot(x, y)
    // return Mine
  }
}
