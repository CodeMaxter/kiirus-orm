module.exports = (genFunc) => {
  let genObj = genFunc()

  run()

  function run (promiseResult = undefined) {
    let item = genObj.next(promiseResult)

    if (!item.done) {
      // A promise was yielded
      item.value
      .then(result => run(result))
      .catch(error => {
        genObj.throw(error)
      })
    }
  }
}
