const findAncestor = (el, cls) => {
  while ((el = el.parentElement) && !el.classList.contains(cls)) {}
  return el
}

const openModal = (modal) => modal.classList.add('show-modal')
const closeModal = (modal) => modal.classList.remove('show-modal')

const createCloseModal = (elem) => {
  closeModal(findAncestor(elem, 'show-modal'))
}

const setLoader = (btn, isEnable) => {
  if (isEnable) {
    const spinner = document.createElement('span')
    spinner.classList.add('spinner')
    const loaderText = document.createTextNode('Loading...')
    btn.classList.add('d-inline-flex')
    btn.classList.add('align-center')
    btn.disabled = true
    btn.innerHTML = ''
    btn.appendChild(spinner)
    btn.appendChild(loaderText)
  } else {
    btn.innerHTML = 'Submit'
    btn.disabled = false
    btn.classList.remove('d-inline-flex')
    btn.classList.remove('align-center')
  }
}
