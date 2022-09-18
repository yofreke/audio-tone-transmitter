# Transmitting data with audio

## Notes

### Entry 2

Getting better, can run at 5Hz pretty stable. Noticed that I have a lot of background noise at under 2KHz, but above that works okay. Next going to try restricting the character set further.

### Entry 1

First attempt seems promising. I take a subsection of 128 ascii, and send those chars by creating a sin wave at a specific frequency. A second browser tab listening to the microphone is able to reasonably well identify the primary frequency when this is being played.

The receiver gets 8-12 frames from the fft, however results are quite noisy. This may be because the logic is only looking for the primary fft bucket, not the absolute value of that bucket.
