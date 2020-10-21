document.addEventListener('DOMContentLoaded', event => {
  const submitResultsForm = document.getElementById('submitResults')
  const submitAgainBtn = document.getElementById("sendResultsAgain");
  const successMessageModal = document.getElementById("successMessage");
  const confirmSendingAgainModal = document.getElementById("confirmSendingAgain");

  const getbyId = function( id ) { return document.getElementById( id ).value; };

  submitResultsForm.addEventListener('submit', async event => {
    event.preventDefault();

    const data = {
      barCode: getbyId('barCode'),
      result: getbyId('result'),
      famEGene: getbyId('famEGene'),
      famCt: getbyId('famCt'),
      calRed61RdRpGene: getbyId('calRed61RdRpGene'),
      calRed61Ct: getbyId('calRed61Ct'),
      quasar670NGene: getbyId('quasar670NGene'),
      quasar670Ct: getbyId('quasar670Ct'),
      hexIC: getbyId('hexIC'),
      hexCt: getbyId('hexCt'),
    }

    try {
      const raw = await fetch('/admin/api/v1/send-and-save-test-results', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (raw.ok) {
        successMessageModal.classList.add("show-modal");
      } else {
        if (raw.status === 409) {
          confirmSendingAgainModal.classList.add("show-modal");
        }
      }
    } catch (e) {
      console.log("jqXHR.status", e);
      console.log("textStatus", e);
    }

  });

  submitAgainBtn.addEventListener('click', async e => {
    const data = {
      barCode: getbyId('barCode'),
    }

    try {
      const raw = await fetch('/admin/api/v1/send-test-results-again', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const content = await raw.json();
      console.log(content);

    } catch (e) {
      console.log(e);
    }

  });

});
