# Mascot artwork

Drop image files here to replace the built-in drawn mascot. The app picks them up automatically on the next build.

File names (one per pose, any of .png / .webp / .svg):

    wave.png       default pose, used everywhere a pose isn't specified (sidebar, greetings)
    listen.png     recorder is in a call / calendar page
    think.png      AI is working, empty search results
    celebrate.png  all done, setup finished
    sleep.png      nothing to show yet
    write.png      writing the summary, project suggestions

Only `wave.png` is required; any missing pose falls back to `wave.png`, and if that is missing too the built-in SVG is used.

Spec: square, transparent background, 1024x1024 or larger, character centered with a little breathing room, consistent style across poses. He is shown as small as 40px, so keep the silhouette simple and the face readable.
