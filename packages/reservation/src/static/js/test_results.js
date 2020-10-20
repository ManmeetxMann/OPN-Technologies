document.addEventListener('DOMContentLoaded', event => {
  const submitResultsForm = document.getElementById('submitResults')
  const submitAgainBtn = document.getElementById("sendResultsAgain");
  const successMessageModal = document.getElementById("successMessage");
  const confirmSendingAgainModal = document.getElementById("confirmSendingAgain");

  submitResultsForm.addEventListener('submit', async event => {
    event.preventDefault();

    const data = {
      barCode: 'TEST1000000005',
      result: 'Positive',
      famEGene: 'fam1',
      famCt: 'fmct',
      calRed61RdRpGene: 'A1000000005',
      calRed61Ct: 'A1000000005',
      quasar670NGene: 'A1000000005',
      quasar670Ct: 'A1000000005',
      hexIC: 'A1000000005',
      hexCt: 'A1000000005',
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
      barCode: 'TEST1000000005',
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
