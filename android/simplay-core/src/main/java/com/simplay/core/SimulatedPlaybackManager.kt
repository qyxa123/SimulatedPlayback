package com.simplay.core

import android.content.Context
import android.content.SharedPreferences
import android.net.Uri
import android.os.Handler
import android.os.Looper
import com.google.android.exoplayer2.ExoPlayer
import com.google.android.exoplayer2.MediaItem

/**
 * SimulatedPlaybackManager wraps an ExoPlayer instance and provides a simulated playback mode.
 * In simulated mode, real playback and network are suspended, while logical progress advances
 * via a lightweight timer and is persisted.
 */
class SimulatedPlaybackManager(private val context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("simplay", Context.MODE_PRIVATE)
    private var player: ExoPlayer? = null
    private var timerHandler: Handler? = null
    private var runnable: Runnable? = null
    private var running = false
    private var uri: Uri? = null

    /** Attach an ExoPlayer and the media URI to manage. */
    fun attachPlayer(p: ExoPlayer, mediaUri: Uri) {
        player = p
        uri = mediaUri
        val item = MediaItem.fromUri(mediaUri)
        p.setMediaItem(item)
    }

    /** Enable simulated mode: pause playback, stop network, and start progress timer. */
    fun enableSimulatedMode() {
        if (running) return
        running = true
        player?.pause()
        player?.stop()
        player?.clearMediaItems()
        timerHandler = Handler(Looper.getMainLooper())
        runnable = object : Runnable {
            override fun run() {
                val t = getSimProgress() + 1
                setSimProgress(t)
                timerHandler?.postDelayed(this, 1000)
            }
        }
        timerHandler?.postDelayed(runnable!!, 1000)
    }

    /** Disable simulated mode: restore media, seek to persisted progress, and resume playback. */
    fun disableSimulatedMode() {
        if (!running) return
        running = false
        runnable?.let { timerHandler?.removeCallbacks(it) }
        runnable = null
        timerHandler = null
        val p = player ?: return
        val u = uri ?: return
        val t = getSimProgress().toLong()
        p.setMediaItem(MediaItem.fromUri(u))
        p.prepare()
        p.seekTo(t * 1000)
        p.play()
    }

    /** Get persisted simulated progress (seconds). */
    fun getSimProgress(): Int {
        val key = keyFor(uri)
        return prefs.getInt(key, 0)
    }

    /** Set persisted simulated progress (seconds). */
    fun setSimProgress(t: Int) {
        val key = keyFor(uri)
        prefs.edit().putInt(key, if (t < 0) 0 else t).apply()
    }

    private fun keyFor(u: Uri?): String {
        return "${u?.toString() ?: "unknown"}"
    }
}
