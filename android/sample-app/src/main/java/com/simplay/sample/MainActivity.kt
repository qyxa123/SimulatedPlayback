package com.simplay.sample

import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.android.exoplayer2.ExoPlayer
import com.google.android.exoplayer2.ui.PlayerView
import com.simplay.core.SimulatedPlaybackManager

class MainActivity : AppCompatActivity() {
    private lateinit var player: ExoPlayer
    private lateinit var manager: SimulatedPlaybackManager
    private lateinit var progress: TextView
    private val handler = Handler(Looper.getMainLooper())
    private var resumeOnStart = false
    private val updateProgress = object : Runnable {
        override fun run() {
            val mode = if (manager.isSimulating) "Simulated" else "Playback"
            progress.text = "$mode: ${manager.getSimProgress()} s"
            handler.postDelayed(this, 500)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val playerView = PlayerView(this)
        progress = TextView(this)
        val enable = Button(this).apply { text = "Start simulated progress" }
        val disable = Button(this).apply { text = "Restore playback" }
        layout.addView(playerView, LinearLayout.LayoutParams(-1, 0, 1f))
        layout.addView(progress)
        layout.addView(enable)
        layout.addView(disable)
        setContentView(layout)

        player = ExoPlayer.Builder(this).build()
        playerView.player = player
        manager = SimulatedPlaybackManager(this)
        manager.attachPlayer(player, Uri.parse("https://storage.googleapis.com/exoplayer-test-media-0/play.mp3"))
        player.prepare()
        player.play()
        enable.setOnClickListener {
            if (!manager.enableSimulatedMode()) {
                Toast.makeText(this, "Wait for a seekable, finite item to load.", Toast.LENGTH_SHORT).show()
            }
        }
        disable.setOnClickListener { manager.disableSimulatedMode() }
    }

    override fun onStart() {
        super.onStart()
        if (resumeOnStart) player.play()
        resumeOnStart = false
        handler.post(updateProgress)
    }

    override fun onStop() {
        handler.removeCallbacks(updateProgress)
        manager.saveProgress()
        resumeOnStart = !manager.isSimulating && player.playWhenReady
        if (!manager.isSimulating) player.pause()
        // The logical clock continues with no scheduled callbacks while the activity is stopped.
        super.onStop()
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        manager.detachPlayer()
        player.release()
        super.onDestroy()
    }
}
