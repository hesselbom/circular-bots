exports.start = (fps, cb) => {
  let fpsInterval = 1000 / fps
  let then = window.performance.now()

  let animate = (newtime) => {
    let now = newtime
    let elapsed = now - then

    if (elapsed > fpsInterval) {
      // Adjust for fpsInterval not being multiple of 16.67
      then = now - (elapsed % fpsInterval)

      if (cb() === false) return
    }

    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)
}
