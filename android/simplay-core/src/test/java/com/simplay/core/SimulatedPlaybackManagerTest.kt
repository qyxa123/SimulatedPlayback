package com.simplay.core

import android.content.Context
import android.net.Uri
import androidx.test.core.app.ApplicationProvider
import com.google.android.exoplayer2.C
import com.google.android.exoplayer2.ExoPlayer
import com.google.android.exoplayer2.MediaItem
import com.google.android.exoplayer2.PlaybackParameters
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.*
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class SimulatedPlaybackManagerTest {
    private lateinit var context: Context
    private lateinit var player: ExoPlayer
    private lateinit var manager: SimulatedPlaybackManager
    private val uri = Uri.parse("https://example.test/video.mp4")
    private var now = 1_000L

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        context.getSharedPreferences("simplay", Context.MODE_PRIVATE).edit().clear().commit()
        player = mock(ExoPlayer::class.java)
        `when`(player.currentPosition).thenReturn(45_250L)
        `when`(player.duration).thenReturn(120_000L)
        `when`(player.currentMediaItem).thenReturn(MediaItem.fromUri(uri))
        `when`(player.currentMediaItemIndex).thenReturn(0)
        `when`(player.isCurrentMediaItemSeekable).thenReturn(true)
        `when`(player.playbackParameters).thenReturn(PlaybackParameters(1.5f))
        `when`(player.playWhenReady).thenReturn(true)
        manager = SimulatedPlaybackManager(context) { now }
        manager.attachPlayer(player, uri)
        clearInvocations(player)
    }

    @Test
    fun restoresActualPositionAndSpeedAfterSleepWithoutTimerTicks() {
        assertTrue(manager.enableSimulatedMode())
        now += 20_000
        assertEquals(75_250L, manager.getSimProgressMs())
        manager.disableSimulatedMode()
        val order = inOrder(player)
        order.verify(player).pause()
        order.verify(player).stop()
        order.verify(player).seekTo(0, 75_250L)
        order.verify(player).prepare()
        order.verify(player).setPlayWhenReady(true)
        assertFalse(manager.isSimulating)
    }

    @Test
    fun repeatedEnableDoesNotResetAnchorOrStopTwice() {
        assertTrue(manager.enableSimulatedMode())
        now += 10_000
        assertTrue(manager.enableSimulatedMode())
        now += 10_000
        assertEquals(75_250L, manager.getSimProgressMs())
        verify(player, times(1)).stop()
        manager.disableSimulatedMode()
        manager.disableSimulatedMode()
        verify(player, times(1)).prepare()
    }

    @Test
    fun durationClampsAndCompletedItemDoesNotAutoplay() {
        manager.enableSimulatedMode()
        now += 100_000
        assertEquals(120_000L, manager.getSimProgressMs())
        manager.disableSimulatedMode()
        verify(player).seekTo(0, 120_000L)
        verify(player).setPlayWhenReady(false)
    }

    @Test
    fun keepsOriginallyPausedItemPaused() {
        `when`(player.playWhenReady).thenReturn(false)
        manager.enableSimulatedMode()
        now += 1_000
        manager.disableSimulatedMode()
        verify(player).setPlayWhenReady(false)
    }

    @Test
    fun seekDuringSimulationReanchorsAndRejectsNegativeProgress() {
        manager.enableSimulatedMode()
        now += 10_000
        manager.setSimProgress(20)
        now += 2_000
        assertEquals(23_000L, manager.getSimProgressMs())
        manager.setSimProgress(-1)
        assertEquals(0L, manager.getSimProgressMs())
    }

    @Test
    fun rejectsMissingUnknownLiveAndUnseekableMedia() {
        val unattached = SimulatedPlaybackManager(context) { now }
        assertFalse(unattached.enableSimulatedMode())
        assertFalse(unattached.isSimulating)
        `when`(player.duration).thenReturn(C.TIME_UNSET)
        assertFalse(manager.enableSimulatedMode())
        `when`(player.duration).thenReturn(120_000L)
        `when`(player.isCurrentMediaItemLive).thenReturn(true)
        assertFalse(manager.enableSimulatedMode())
        `when`(player.isCurrentMediaItemLive).thenReturn(false)
        `when`(player.isCurrentMediaItemSeekable).thenReturn(false)
        assertFalse(manager.enableSimulatedMode())
        verify(player, never()).stop()
    }

    @Test
    fun externalMediaReplacementIsNeverSoughtOrPrepared() {
        manager.enableSimulatedMode()
        now += 10_000
        `when`(player.currentMediaItem).thenReturn(MediaItem.fromUri("https://example.test/next.mp4"))
        `when`(player.currentPosition).thenReturn(1_000L)
        manager.disableSimulatedMode()
        manager.saveProgress()
        manager.detachPlayer()
        verify(player, never()).seekTo(anyInt(), anyLong())
        verify(player, never()).prepare()
        assertFalse(manager.enableSimulatedMode())
        val prefs = context.getSharedPreferences("simplay", Context.MODE_PRIVATE)
        assertEquals(60_250L, prefs.getLong("positionMs:$uri", -1L))
    }

    @Test
    fun normalReplacementCannotReadSeekOrCheckpointUnderOldUri() {
        manager.saveProgress()
        `when`(player.currentMediaItem).thenReturn(MediaItem.fromUri("https://example.test/next.mp4"))
        `when`(player.currentPosition).thenReturn(1_000L)
        assertEquals(45_250L, manager.getSimProgressMs())
        assertFalse(manager.enableSimulatedMode())
        manager.setSimProgress(10)
        manager.saveProgress()
        manager.detachPlayer()
        verify(player, never()).seekTo(anyLong())
        val prefs = context.getSharedPreferences("simplay", Context.MODE_PRIVATE)
        assertEquals(45_250L, prefs.getLong("positionMs:$uri", -1L))
    }

    @Test
    fun detachingActiveReplacementSavesOriginalVirtualPosition() {
        manager.enableSimulatedMode()
        now += 10_000
        `when`(player.currentMediaItem).thenReturn(MediaItem.fromUri("https://example.test/next.mp4"))
        `when`(player.currentPosition).thenReturn(1_000L)
        manager.detachPlayer()
        val prefs = context.getSharedPreferences("simplay", Context.MODE_PRIVATE)
        assertEquals(60_250L, prefs.getLong("positionMs:$uri", -1L))
    }

    @Test
    fun detachSavesLogicalProgressWithoutResumingOrReleasingOwnedPlayer() {
        manager.enableSimulatedMode()
        now += 10_000
        manager.detachPlayer()
        assertFalse(manager.isSimulating)
        assertFalse(manager.enableSimulatedMode())
        verify(player, never()).prepare()
        verify(player, never()).release()
        manager.attachPlayer(player, uri)
        verify(player).setMediaItem(MediaItem.fromUri(uri), 60_250L)
    }

    @Test
    fun readingProgressDoesNotWritePreferencesAndCheckpointKeepsClockRunning() {
        manager.enableSimulatedMode()
        val prefs = context.getSharedPreferences("simplay", Context.MODE_PRIVATE)
        now += 10_000
        assertEquals(60_250L, manager.getSimProgressMs())
        assertEquals(45_250L, prefs.getLong("positionMs:$uri", -1L))
        manager.saveProgress()
        assertEquals(60_250L, prefs.getLong("positionMs:$uri", -1L))
        now += 10_000
        assertEquals(75_250L, manager.getSimProgressMs())
        assertTrue(manager.isSimulating)
    }

    @Test
    fun migratesLegacySecondsOnAttach() {
        manager.detachPlayer()
        context.getSharedPreferences("simplay", Context.MODE_PRIVATE).edit().clear()
            .putInt(uri.toString(), 37).commit()
        manager.attachPlayer(player, uri)
        verify(player).setMediaItem(MediaItem.fromUri(uri), 37_000L)
    }
}
