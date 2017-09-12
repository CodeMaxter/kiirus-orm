'use strict'

module.exports = class HigherOrderTapProxy {
  /**
   * Create a new tap proxy instance.
   *
   * @param  {*}  target
   * @return {void}
   */
  constructor (target) {
    /**
     * The target being tapped.
     *
     * @var {*}
     */
    const _target = target

    return new Proxy(this, {
      get (target, property, receiver) {
        return () => {
          _target[property](...arguments)

          return _target
        }
      }
    })
  }
}
