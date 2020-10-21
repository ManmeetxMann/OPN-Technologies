document.addEventListener('DOMContentLoaded', event => {
  const submitResultsForm = document.getElementById('submitResults')
  const submitAgainBtn = document.getElementById("sendResultsAgain");

  const getbyId = function( id ) { return document.getElementById( id ).value; };
  const showAlertModal = function(title, message) {
    $('#message .modal-title').html(title);
    $('#message .modal-body').html(message);
    $('#message').modal();
    $('#message').modal('show');
  }
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
      const response = await fetch('/admin/api/v1/send-and-save-test-results', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const responseData = await response.json();

      if (response.ok) {
        showAlertModal("Success", responseData.data);
      } else {
        if (response.status === 409) {
          $('#confirmSendingAgain').modal();
          $('#confirmSendingAgain').modal('show');
        }else{
          showAlertModal("Failed", responseData.status.message);
        }
      }
    } catch (e) {
      showAlertModal("Failed", "Something went wrong. Please try after sometime.");
    }

  });

  submitAgainBtn.addEventListener('click', async e => {
    const data = {
      barCode: getbyId('barCode'),
    }

    try {
      const response = await fetch('/admin/api/v1/send-test-results-again', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const responseData = await response.json();
      if (response.ok) {
        showAlertModal("Success", responseData.data);
      }else{
        showAlertModal("Failed", responseData.status.message);
      }
    } catch (e) {
      showAlertModal("Failed", "Something went wrong. Please try after sometime.");
    }

  });

});
