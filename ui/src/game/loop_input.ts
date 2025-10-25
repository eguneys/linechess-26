export type Loop = {
  start: () => void
  stop: () => void
}

export function Loop(update: (dt: number) => void, render: (alpha: number) => void) {

  const timestep = 1000/60
  let last_time = performance.now()
  let accumulator = 0

  let cancel_frame: number

  function step(current_time: number) {
    cancel_frame = requestAnimationFrame(step)


    let delta_time = Math.min(current_time - last_time, 1000)
    last_time = current_time

    accumulator += delta_time

    while (accumulator >= timestep) {
      update(timestep)
      accumulator -= timestep
    }

    render(accumulator / timestep)
  }

  return {
    start() {
      cancelAnimationFrame(cancel_frame)
      cancel_frame = requestAnimationFrame(step)
    },
    stop() {
      cancelAnimationFrame(cancel_frame)
    }

  }
}

type XY = [number, number]
export type TouchMouse = {
  on_up(n: XY): void
  on_down(n: XY): void
  on_move(n: XY): void
}

export function TouchMouse(el: HTMLElement, hooks: TouchMouse) {

  const eventPosition = (e: PointerEvent): [number, number] | undefined => {
    if (e.clientX || e.clientX === 0) return [e.clientX, e.clientY!];
  };

  const normalized = (e: PointerEvent): [number, number] => {
    let [x, y] = eventPosition(e) ?? [0, 0]

    return [(x - bounds.left), (y - bounds.top)]
    //return [(x - bounds.left) / bounds.width, (y - bounds.top) / bounds.height]
  }

  function on_down(ev: PointerEvent) {
    ev.preventDefault()
    el.setPointerCapture(ev.pointerId)
    let p = normalized(ev)
    hooks.on_down(p)
  }

  function on_up(ev: PointerEvent) {
    let p = normalized(ev)
    hooks.on_up(p)
  }

  function on_move(ev: PointerEvent) {
    let p = normalized(ev)
    hooks.on_move(p)
  }
  
  let bounds: DOMRect
  on_resize()

  function on_resize() {
    bounds = el.getBoundingClientRect()
  }

  function on_scroll() {
    on_resize()
  }

  el.addEventListener('pointerdown', on_down, { passive: false })
  el.addEventListener('pointermove', on_move, { passive: false })
  document.addEventListener('pointerup', on_up)


  let resize_obs = new ResizeObserver(on_resize)
  resize_obs.observe(el)

  document.addEventListener('scroll', on_scroll, { capture: true, passive: true })
  window.addEventListener('resize', on_scroll, { passive: true })


  return () => {
    el.removeEventListener('pointerdown', on_down)
    el.removeEventListener('pointermove', on_move)

    document.removeEventListener('pointerup', on_up)

    document.removeEventListener('scroll', on_scroll)

    window.removeEventListener('resize', on_scroll)

    resize_obs.unobserve(el)
  }
}