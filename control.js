// Just to make blockly interactive first and let libraries load in the background
window.onload = function () {

  const content_control = document.querySelector("#content_control");
  const control_percentage_range = document.querySelector("#control_percentage_range");
  const control_destination = document.querySelector("#control_destination");
  const control_send = document.querySelector("#control_send");

  const event_logs = document.querySelector("#event_logs");
  const control_label = document.querySelector("#control_label");
  const control_percentage_value = document.querySelector("#control_percentage_value");
  const control_timestamp_value  = document.querySelector("#control_timestamp_value");
  const control_color_value  = document.querySelector("#control_color_value");
  const control_color_picker  = document.querySelector("#control_color_picker");

  // CONTROL TYPE HANDLER
  let currentControlType = "percentage_control";
  document.querySelector("#control_type").onchange = e => {
    const controlType = e.target.options[e.target.selectedIndex].value;
    // Hide other controls
    document.querySelector(`#${currentControlType}`).style.display = "none";
    document.querySelector(`#${controlType}`).style.display = "block";

    currentControlType = controlType
  }

  control_label.onchange = e => {
    this.value = this.value.replace(/\W/g, "").substring(0, 5);
  };

  control_color_picker.oninput = e => {
    control_color_value.value = control_color_picker.value;
  }

  control_color_value.oninput = e => {
    control_color_picker.value = getHexColor(control_color_value.value);
  }

  const timeline_toggle = document.querySelector("#timeline_toggle");
  const timeline_container = document.querySelector("#timeline_container");
  const wavesurfer_container = document.querySelector("#waveform_container");

  timeline_toggle.addEventListener("click", function () {
    timeline_container.classList.toggle("openned");
    wavesurfer_container.classList.toggle("hidden");
  })

  // !! problems with layout, so we need to do this somehow manually
  // TODO make it responsive on resize
  // TODO make wavesurfer rerenders only when openned
  // TODO add Zoom and time-line functionality like in Tangler
  window.wavesurfer = WaveSurfer.create({
    container: '#waveform',
    height: 60
  });
  wavesurfer.setMute(true);
  window.musicDebounce = false;


  function handlePercentageValueChange(e) {
    const value = e.target.value;
    handleControlSend(value);
  }

  function handleColorValueChange(e) {
    const value = e.target.value;
    handleControlSend(value);
  }

  function handleControlSend(value=null) {
    let log_value = "";
    if (currentControlType === "percentage_control") {
      if (value === null) {
        log_value = control_percentage_value.value + '%';
        Code.device.emitPercentageEvent(control_label.value, parseFloat(control_percentage_value.value), control_destination.value);
      } else {
        log_value = value + "%";
        Code.device.emitPercentageEvent(control_label.value, parseFloat(value), control_destination.value);
      }
    } else if (currentControlType === "color_control") {
      // if (!value) {
      const hexColor = getHexColor(document.querySelector("#control_color_value").value);
      log_value = `<span style="color:${hexColor}">` + hexColor + `</span>`;
      Code.device.bluetoothDevice.emitColorEvent(control_label.value, hexColor, control_destination.value);
      // } else {
      // Code.device.bluetoothDevice.emitColorEvent(control_label.value, value, control_destination.value);
      // }
    } else if (currentControlType === "timestamp_control") {
      log_value = control_timestamp_value.value + " ms";
      // TODO parse timeparams (x seconds, x minutes, x hours, x days), like in block
      Code.device.bluetoothDevice.emitTimestampEvent(control_label.value, control_timestamp_value.value, control_destination.value);
    }

    const logmessageDOM = document.createElement("li");
    // TODO edit this message accordingly to each control type
    logmessageDOM.innerHTML = `${new Date().toString().slice(15, 24)} ${currentControlType}: $${control_label.value}, ${log_value} -> ${control_destination.value}`;
    event_logs.appendChild(logmessageDOM);
    event_logs.scrollTop = -999999999;
  }

  control_percentage_range.oninput = handlePercentageValueChange;
  control_color_picker.onchange = handleColorValueChange;

  control_send.onclick = (e) => handleControlSend();

  const saveFile = document.querySelector("#saveFile");
  const loadFile = document.querySelector("#loadFile");

  saveFile.onclick = (_) => {
    const zip = new JSZip();
    const data = Blockly.Xml.domToPrettyText(Blockly.Xml.workspaceToDom(Code.workspace));
    zip.file("version", "0.6.1");

    zip.file("content.xml", data);
    if (window.blockly_music) {
      zip.file("music.mp3", window.blockly_music);
    }
    if (window.blockly_metronome) {
      zip.file("metronome.mp3", window.blockly_metronome);
    }

    zip.generateAsync({ type: "blob" }).then(function (content) {
      saveAs(content, document.querySelector("#filename").value.replace(/\.tgbl$/, "") + ".tgbl");
    });
  };

  loadFile.onclick = (_) => {
    function loadBlocksfromXmlDom(blocksXmlDom) {
      try {
        Blockly.Xml.domToWorkspace(blocksXmlDom, Code.workspace);
      } catch (e) {
        return false;
      }
      return true;
    }

    function replaceBlocksfromXml(blocksXml) {
      var xmlDom = null;
      try {
        xmlDom = Blockly.Xml.textToDom(blocksXml);
      } catch (e) {
        return false;
      }
      Code.workspace.clear();
      var sucess = false;
      if (xmlDom) {
        sucess = loadBlocksfromXmlDom(xmlDom);
      }
      return true;
    }

    // Create File Reader event listener function
    const parseInputXMLfile = function (e) {
      const file = e.target.files[0];
      const filename = file.name;
      document.querySelector("#filename").value = filename;
      JSZip.loadAsync(file).then(async function (zip) {
        const xmlContent = await zip.file("content.xml").async("text");
        const success = replaceBlocksfromXml(xmlContent);

        if (zip.file("music.mp3")) {
          window.blockly_music = await zip.file("music.mp3").async("blob");
          const music_url = URL.createObjectURL(window.blockly_music);
          Code.music.setAttribute("src", music_url);
          wavesurfer.load(music_url);
        }

        if (zip.file("metronome.mp3")) {
          window.blockly_music = await zip.file("metronome.mp3").async("blob");
          Code.music.setAttribute("src", URL.createObjectURL(window.blockly_music));
        }

        console.log("File " + filename + " is loaded");

        console.log("Trying to upload tngl...");
        Code.device.writeTngl();

        if (success) {
          Code.renderContent();
        } else {
          alert("Ooops something went wrong during load. Try again with another file.");
        }
      });
    };

    // Create once invisible browse button with event listener, and click it
    var selectFile = document.getElementById("select_file");
    if (selectFile === null) {
      var selectFileDom = document.createElement("INPUT");
      selectFileDom.type = "file";
      selectFileDom.id = "select_file";

      var selectFileWrapperDom = document.createElement("DIV");
      selectFileWrapperDom.id = "select_file_wrapper";
      selectFileWrapperDom.style.display = "none";
      selectFileWrapperDom.appendChild(selectFileDom);

      document.body.appendChild(selectFileWrapperDom);
      selectFile = document.getElementById("select_file");
      selectFile.addEventListener("change", parseInputXMLfile, false);
    }
    selectFile.click();
  };

  // MUSIC controls
  wavesurfer.on('interaction', e => {
    if (!musicDebounce) {
      Code.music.currentTime = wavesurfer.getCurrentTime()
      musicDebounce = true;
      setTimeout(_ => musicDebounce = false, 20)
    }
  })

  Code.music.onplay = _ => wavesurfer.play();
  Code.music.onpause = _ => wavesurfer.pause();
  Code.music.onstop = _ => wavesurfer.stop();
}


Code.music.addEventListener("timeupdate", () => {
  if (!musicDebounce && Code.music.paused) {
    Code.timeline.setMillis(Code.music.currentTime * 1000);
    wavesurfer.setCurrentTime(Code.music.currentTime);
    Code.device.syncTimeline();
    musicDebounce = true
    setTimeout(_ => musicDebounce = false, 20)
  }
});

document.getElementById("music").addEventListener("change", function () {
  var url = URL.createObjectURL(this.files[0]);
  window.blockly_music = this.files[0];
  Code.music.setAttribute("src", url);
  wavesurfer.load(url);
});




function getHexColor(colorStr) {
  const a = document.createElement("div");
  a.style.color = colorStr;
  const colors = window
    .getComputedStyle(document.body.appendChild(a))
    .color.match(/\d+/g)
    .map(function (a) {
      return parseInt(a, 10);
    });
  document.body.removeChild(a);
  return colors.length >= 3
    ? "#" +
    ((1 << 24) + (colors[0] << 16) + (colors[1] << 8) + colors[2])
      .toString(16)
      .substr(1)
    : false;
}
