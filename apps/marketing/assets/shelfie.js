(() => {
  document.documentElement.classList.add('reveal-ready')

  const header = document.querySelector('[data-header]')
  const menuButton = document.querySelector('[data-menu-button]')
  const menu = document.querySelector('[data-mobile-menu]')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const setMenu = (open) => {
    header.classList.toggle('is-open', open)
    document.body.classList.toggle('menu-open', open)
    menuButton.setAttribute('aria-expanded', String(open))
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation')
    menu.inert = !open
  }

  menuButton.addEventListener('click', () => setMenu(!header.classList.contains('is-open')))
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)))
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false)
  })
  window.matchMedia('(width < 64rem)').addEventListener('change', (event) => {
    if (!event.matches) setMenu(false)
  })

  const setHeaderState = () => header.classList.toggle('is-scrolled', window.scrollY > 12)
  setHeaderState()
  window.addEventListener('scroll', setHeaderState, { passive: true })

  const revealItems = document.querySelectorAll('[data-reveal]')
  if (reducedMotion) {
    revealItems.forEach((item) => item.classList.add('is-visible'))
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    revealItems.forEach((item) => observer.observe(item))
  }

  const year = document.querySelector('[data-year]')
  if (year) year.textContent = String(new Date().getFullYear())
})()
