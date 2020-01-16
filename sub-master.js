mp.add_key_binding("w", "set-start-timestamp", set_start_timestamp);                    // Set start timestamp for cut-audio-fragment
mp.add_key_binding("e", "set-end-timestamp", set_end_timestamp);                        // Set end timestamp for cut-audio-fragment
mp.add_key_binding("Meta+r", "cut-audio-fragment-quickly", cut_audio_fragment_quickly); // Cuts audio from last displayed subtitle clip and copies it to clipboard (macOS only)
mp.add_key_binding("Meta+R", "cut-audio-fragment", cut_audio_fragment);                 // Cuts audio from start timestamp to end timestamp and copies it to clipboard (macOS only)
mp.add_key_binding("Meta+x", "copy-sub", copy_sub);                                     // Copies currently displaying subtitle
mp.add_key_binding("DOWN", "replay-sub", replay_sub);                                   // Replays last displayed subtitle
mp.add_key_binding("LEFT", "previous-sub", previous_sub);                               // Goes back to last subtitle (before last displayed subtitle)
mp.add_key_binding("RIGHT", "next-sub", next_sub);                                      // Goes to next subtitle
mp.add_key_binding("Meta+s", "toggle-pause-option", toggle_pause_option);               // Toggles pause after encoding for cut-audio-fragment-quickly


// If using IINA, be sure to check off "Use config directory" in Preferences > Advanced.
// Set config directory to "~/.config/mpv/", or wherever mpv keeps your config files.

/* IINA Key Bindings:
Make sure to duplicate your choice of key binding settings:
Add these keys to your chosen key binding list (they should override any existing key bindings,
so if you want to keep any previous key bindings, change them... or I guess you can change these):
    w       script-binding set-start-timestamp
    e       script-binding set-end-timestamp
    Meta+r  script-binding cut-audio-fragment-quickly
    Meta+R  script-binding cut-audio-fragment
    Meta+x  script-binding copy-sub
    DOWN    script-binding replay-sub
    LEFT    script-binding previous-sub
    RIGHT   script-binding next-sub
    Meta+s  script-binding toggle-pause-option
*/

/* Options: change these to the appropriate paths */
mpv_path = "/usr/local/bin/mpv"; // In IINA, change this to the path given by `$ which mpv` in Terminal
output_path = "/Users/username/Life/Anki\ Audio/" // Change this to wherever you want mpv to save your audio files
/* End of options */

ytdl_title = true;
pauseAfterQuickCut = true;

function cut_audio_fragment_quickly() {
    mp.set_property("pause", "yes");
    set_end_timestamp();
    print("End timestamp: success!");

    do { 
        dump(mp.wait_event(0));
        replay_sub();
        set_start_timestamp();
    } while (mp.wait_event(0).event !== "none");
    print("Start timestamp: success!");
    
    do {
        dump(mp.wait_event(0));
        mp.commandv("seek", end_timestamp, "absolute+exact");
        cut_audio_fragment();
        if (!pauseAfterQuickCut) {
            mp.set_property("pause", "no");
        }
    } while (mp.wait_event(0).event !== "none");
    print("Audio fragment cut: success!");
}

function cut_audio_fragment() {
    video_path = mp.get_property("path");
    video_filename = mp.get_property("filename/no-ext");

    if (start_timestamp && end_timestamp) {
        mp.osd_message("Encoding Audio from " + seconds_to_time_string(start_timestamp) + " to " + seconds_to_time_string(end_timestamp), 1);

        aid = mp.get_property("aid");

        if (video_path.match("youtube.com")) {
            video_filename = video_filename.replace(/watch\?v=/g, "");
        }

        if (video_path.substring(1, 4) === "http" && ytdl_title) {
            media_title = mp.get_property("media-title");
            if (video_path.match(/(youtube|youtu\.be|crunchyroll|vrv)\.com?/)) {
                video_filename = format_filename(media_title + "-" + video_filename);
            } else {
                video_filename = format_filename(media_title);
            }
        }

        filename = [
            output_path,
            video_filename,
            ".",
            seconds_to_time_string(start_timestamp, true),
            "-",
            seconds_to_time_string(end_timestamp, true),
            ".mp3"
        ].join("");

        args = [
            mpv_path,
            video_path,
            "--start", start_timestamp.toString(),
            "--end", end_timestamp.toString(),
            "--aid", aid.toString(),
            "--video=no",
            "--o=" + filename
        ];

        if (video_path.substring(1, 4) === "http" && mp.get_property("ytdl-format") !== "") {
            args.splice(args.length - 1, 0, "--ytdl-format=" + mp.get_property("ytdl-format"));  
        }

        // works
        mp.utils.subprocess_detached({ args: args, cancellable: false });

        if (mp.utils.file_info(filename) === undefined) {
            var copier = setInterval(function() {
                mp.msg.info("Downloading and copying audio file...");
                mp.commandv("run", "/bin/bash", "-c", "file-to-clipboard() { osascript -e 'on run args' -e 'set the clipboard to POSIX file (first item of args)' -e end \"$@\" ; } ; file-to-clipboard " + escapeFile(filename));
                if (mp.utils.file_info(filename) !== undefined && mp.utils.file_info(filename).size > 2000) {
                    mp.msg.info("Audio file succesfully copied.");
                    print(mp.utils.file_info(filename).size + " bytes");
                    clearInterval(copier);
                } else {
                    mp.osd_message("Failed. Please try again.", 3);
                    mp.commandv("run", "/bin/bash", "-c", "echo \"File not large enough, removing file...\" ; rm -f " + escapeFile(filename));
                    clearInterval(copier);
                }
            }, 1000);
        } else {
            mp.msg.error("Error: file already exist.");
            mp.commandv("run", "/bin/bash", "-c", "echo \"File already exists, removing similar file...\" ; rm -f " + escapeFile(filename));
        }
    }
}

function toggle_pause_option() {
    pauseAfterQuickCut = !pauseAfterQuickCut;
    if (pauseAfterQuickCut) mp.osd_message("Pause after encoding audio: true");
    else mp.osd_message("Pause after encoding audio: false");
}

function replay_sub() {
    mp.command("no-osd sub-seek 0");
}

function next_sub() {
    mp.command("no-osd sub-seek 1");
}

function previous_sub() {
    mp.command("no-osd sub-seek -1");
}


function copy_sub() {
    var subtext = mp.get_property("sub-text");
    subtext = subtext.replace(/\r?\n|\r|\s| /g, "");
    mp.commandv("run", "/bin/sh", "-c", "export LANG=ja_JP.UTF-8 ; echo " + subtext + " | pbcopy");
}

// Old command in IINA:
// run "/bin/sh" "-c" "export LANG=ja_JP.UTF-8 ; STR=$'${sub-text}' ; echo \"$STR\" | sed -e 's/\\r?\\n|\\r|\\s| |\\n//g' | pbcopy"
// or
// run "/bin/sh" "-c" "export LANG=ja_JP.UTF-8 ; STR=$'${sub-text}' ; echo \"$STR\" | pbcopy"


function set_start_timestamp() {
    start_timestamp = mp.get_property_number("time-pos");
    mp.osd_message("Start: " + seconds_to_time_string(start_timestamp), 1);
}

function set_end_timestamp() {
    end_timestamp = mp.get_property_number("time-pos");
    mp.osd_message("End: " + seconds_to_time_string(end_timestamp), 1);
}

function format_filename(filename) {
    var valid_characters = "-_.() abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    
    var t = [];
    for (var i = 0; i < filename.length; i++) {
        var c = filename.substring(i,i);
        if (valid_characters.match(escapeRegExp(c))) {
            t[t.length + 1] = c;
        } else {
            t[t.length + 1] = "#";
        }
    }

    var str = t.join("");
    str = str.replace(/^\s*(.*)\s*$/g, "$1");
    str = str.replace(/^[# -]*(.*)[# ]*$/g, "$1");
    str = str.replace(/#/g, "_");
    str = str.replace(/__+/g, "_");    ;

    return str;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeFile(string) {
    return string.replace(/[{}()|!\"#$&\'\*\,\;\<=>\?^\`\|~[\]\\ ]/g, '\\$&');
}

function seconds_to_time_string(duration, flag) {
    var hours = Math.floor(duration / 3600);
    var minutes = Math.floor(duration / 60 % 60);
    var seconds = Math.floor(duration % 60);
    var milliseconds = (duration * 1000) % 1000;
    if (!flag) return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
    else return hours + "." + minutes + "." + seconds;
}
