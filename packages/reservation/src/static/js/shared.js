const findAncestor = (el, cls) => {
  while ((el = el.parentElement) && !el.classList.contains(cls)) {}
  return el
}

const openModal = (modal) => modal.classList.add('show-modal')
const closeModal = (modal) => modal.classList.remove('show-modal')

const createCloseModal = (elem) => {
  closeModal(findAncestor(elem, 'show-modal'))
}
