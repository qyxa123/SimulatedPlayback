package com.simplay.sample

import android.net.Uri
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import android.widget.Button
import android.widget.LinearLayout
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.google.android.exoplayer2.ExoPlayer
import com.google.android.exoplayer2.ui.PlayerView
import com.simplay.core.SimulatedPlaybackManager

class MainActivity : AppCompatActivity() {
    private lateinit var player: ExoPlayer
    private lateinit var manager: SimulatedPlaybackManager
    private var logHandler: Handler? = null
    private var logRunnable: Runnable? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val layout = LinearLayout(this)
        layout.orientation = LinearLayout.VERTICAL
        val pv = PlayerView(this)
        val btnEnable = Button(this)
        val btnDisable = Button(this)
        btnEnable.text = "Sim ON"
        btnDisable.text = "Sim OFF"
        layout.addView(pv)
        layout.addView(btnEnable)
        layout.addView(btnDisable)
        setContentView(layout)
        player = ExoPlayer.Builder(this).build()
        pv.player = player
        manager = SimulatedPlaybackManager(this)
        val demoUri = Uri.parse("https://storage.googleapis.com/exoplayer-test-media-0/play.mp3")
        manager.attachPlayer(player, demoUri)
        btnEnable.setOnClickListener { manager.enableSimulatedMode() }
        btnDisable.setOnClickListener { manager.disableSimulatedMode() }

        logHandler = Handler(Looper.getMainLooper())
        logRunnable = object : Runnable {
            override fun run() {
                Log.d("SimPlay", "simProgress=${manager.getSimProgress()}s")
                logHandler?.postDelayed(this, 5000)
            }
        }
        logHandler?.postDelayed(logRunnable!!, 5000)
    }

    override fun onStop() {
        super.onStop()
        player.release()
        logRunnable?.let { logHandler?.removeCallbacks(it) }
    }
}
