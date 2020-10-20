$(function() {
    $( "#submitResults" ).submit(function( event ) {
        // Stop form from submitting normally
        event.preventDefault();

        var data = {
            "barCode":"TEST1000000005",
            "result": "Positive",
            "famEGene": "fam1",
            "famCt": "fmct",
            "calRed61RdRpGene": "A1000000005",
            "calRed61Ct": "A1000000005",
            "quasar670NGene": "A1000000005",
            "quasar670Ct": "A1000000005",
            "hexIC": "A1000000005",
            "hexCt": "A1000000005"
        };

        $.ajax({
            'type': 'POST',
            'url': "/admin/api/v1/send-and-save-test-results",
            'contentType': 'application/json',
            'data': JSON.stringify(data),
            'dataType': 'json',
            'success': function(){
                $('#successMessage').modal()
                $('#successMessage').modal('show')
            },
            'error':function( jqXHR,  textStatus, errorThrown){
                if(jqXHR.status == 409){
                    $('#confirmSendingAgain').modal()
                    $('#confirmSendingAgain').modal('show')
                }
                console.log(jqXHR.status);
                console.log(textStatus);
            }
        });
    });

    $( "#sendResultsAgain" ).click(function( event ) {

        var data = {
            "barCode":"TEST1000000005"
        };

        $.ajax({
            'type': 'POST',
            'url': "/admin/api/v1/send-test-results-again",
            'contentType': 'application/json',
            'data': JSON.stringify(data),
            'dataType': 'json',
            'success': function(){
                $('#successMessage').modal()
                $('#successMessage').modal('show')
            },
            'error':function( jqXHR,  textStatus, errorThrown){
                console.log(jqXHR.status);
                console.log(textStatus);
                console.log(errorThrown);
            }
        });
    });
});