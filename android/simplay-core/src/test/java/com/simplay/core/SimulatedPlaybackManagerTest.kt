package com.simplay.core

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Test

class SimulatedPlaybackManagerTest {
    @Test
    fun setAndGetProgress() {
        val ctx = ApplicationProvider.getApplicationContext<Context>()
        val m = SimulatedPlaybackManager(ctx)
        m.setSimProgress(10)
        assertEquals(10, m.getSimProgress())
    }
}
