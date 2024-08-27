function loading(status = true) {
    $("#submitBtn").html(
      status ? '<span class="loader"></span>' : "Submit"
    );
  }