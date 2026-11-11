package com.simplay.core

import android.content.Context
import android.net.Uri
import android.os.SystemClock
import com.google.android.exoplayer2.C
import com.google.android.exoplayer2.ExoPlayer
import com.google.android.exoplayer2.MediaItem

/**
 * Manages one seekable, finite media item. Call on the player's application thread.
 * Stopping ExoPlayer cancels its loading; unrelated app traffic is unaffected.
 * The caller owns the player and must call [detachPlayer] before releasing it.
 */
class SimulatedPlaybackManager @JvmOverloads constructor(
    context: Context,
    private val elapsedRealtime: () -> Long = SystemClock::elapsedRealtime
) {
    private val prefs = context.applicationContext.getSharedPreferences("simplay", Context.MODE_PRIVATE)
    private var player: ExoPlayer? = null
    private var uri: Uri? = null
    private var attachedItem: MediaItem? = null
    private var timeline: SimulatedTimeline? = null
    private var resumePlayback = false
    private var simulatedItem: MediaItem? = null
    private var simulatedIndex = 0

    val isSimulating: Boolean get() = timeline != null

    /** Attach and restore a media item; the caller then calls prepare() and play(). */
    fun attachPlayer(p: ExoPlayer, mediaUri: Uri) {
        detachPlayer()
        player = p
        uri = mediaUri
        val item = MediaItem.fromUri(mediaUri)
        attachedItem = item
        p.setMediaItem(item, persistedPosition())
    }

    /**
     * Starts at the actual player position and speed. Returns false for an unattached,
     * unprepared, live, or non-seekable item. Repeated calls do not reset the clock.
     */
    fun enableSimulatedMode(): Boolean {
        if (isSimulating) return true
        val p = boundPlayer() ?: return false
        val duration = p.duration
        if (duration == C.TIME_UNSET || duration <= 0 || p.isCurrentMediaItemLive ||
            !p.isCurrentMediaItemSeekable || p.currentMediaItem == null) return false
        val speed = p.playbackParameters.speed.toDouble()
        if (!speed.isFinite() || speed <= 0) return false
        val next = SimulatedTimeline(p.currentPosition, duration, speed, elapsedRealtime)
        resumePlayback = p.playWhenReady
        simulatedItem = p.currentMediaItem
        simulatedIndex = p.currentMediaItemIndex
        p.pause()
        p.stop()
        timeline = next
        persist(next.positionMs())
        return true
    }

    /** Restore the logical position, prepare, and preserve the previous play/pause intent. */
    fun disableSimulatedMode() {
        val active = timeline ?: return
        val position = active.positionMs()
        timeline = null
        persist(position)
        val p = player ?: return
        // An application may replace its item externally. Never seek into the replacement.
        if (p.currentMediaItem != simulatedItem || p.currentMediaItemIndex != simulatedIndex) {
            // The old checkpoint is already saved. Forget the binding so a later detach
            // cannot overwrite it with the replacement item's unrelated position.
            player = null
            uri = null
            attachedItem = null
            simulatedItem = null
            resumePlayback = false
            return
        }
        p.seekTo(simulatedIndex, position)
        p.prepare()
        p.playWhenReady = resumePlayback && position < active.durationMs
        simulatedItem = null
    }

    /** Logical position in milliseconds, including time spent asleep without timer callbacks. */
    fun getSimProgressMs(): Long = timeline?.positionMs()
        ?: boundPlayer()?.currentPosition?.coerceAtLeast(0L)
        ?: persistedPosition()

    /** Compatibility API: progress in whole seconds. */
    fun getSimProgress(): Int = (getSimProgressMs() / 1000L).coerceAtMost(Int.MAX_VALUE.toLong()).toInt()

    /** Seek/re-anchor progress. Calling this without an attached item has no effect. */
    fun setSimProgress(t: Int) {
        if (uri == null) return
        val requested = t.coerceAtLeast(0).toLong() * 1000L
        val active = timeline
        val position = if (active != null) {
            active.seek(requested)
            active.positionMs()
        } else {
            val p = boundPlayer() ?: return
            val duration = p.duration
            val target = if (duration > 0) requested.coerceAtMost(duration) else requested
            p.seekTo(target)
            target
        }
        persist(position)
    }

    /** Checkpoint at a lifecycle boundary without stopping the logical clock. */
    fun saveProgress() {
        val position = timeline?.positionMs() ?: boundPlayer()?.currentPosition ?: return
        persist(position)
    }

    /** Save the latest position and forget the player; does not release or resume it. */
    fun detachPlayer() {
        saveProgress()
        timeline = null
        simulatedItem = null
        player = null
        uri = null
        attachedItem = null
        resumePlayback = false
    }

    private fun boundPlayer(): ExoPlayer? = player?.takeIf {
        it.currentMediaItem == attachedItem && it.currentMediaItemIndex == 0
    }

    private fun persistedPosition(): Long {
        val mediaUri = uri ?: return 0L
        val key = "positionMs:$mediaUri"
        return if (prefs.contains(key)) prefs.getLong(key, 0L).coerceAtLeast(0L)
        else prefs.getInt(mediaUri.toString(), 0).coerceAtLeast(0).toLong() * 1000L
    }

    private fun persist(positionMs: Long) {
        val mediaUri = uri ?: return
        prefs.edit().putLong("positionMs:$mediaUri", positionMs.coerceAtLeast(0L)).apply()
    }
}
