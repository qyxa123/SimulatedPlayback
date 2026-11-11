package com.simplay.core

import org.junit.Assert.assertEquals
import org.junit.Test

class SimulatedTimelineTest {
    @Test
    fun countsSleepAtFractionalSpeedAndClampsAtEnd() {
        var now = 2_000L
        val clock = SimulatedTimeline(5_000L, 60_000L, 0.5) { now }
        now += 30_000
        assertEquals(20_000L, clock.positionMs())
        now += 1_000_000
        assertEquals(60_000L, clock.positionMs())
    }

    @Test
    fun seekingReanchorsTimeAndClampsNegativeValues() {
        var now = 0L
        val clock = SimulatedTimeline(10_000L, 60_000L, 2.0) { now }
        now = 5_000
        clock.seek(30_000)
        now = 6_000
        assertEquals(32_000L, clock.positionMs())
        clock.seek(-1)
        assertEquals(0L, clock.positionMs())
    }

    @Test(expected = IllegalArgumentException::class)
    fun rejectsInvalidSpeed() {
        SimulatedTimeline(0, 60_000, Double.NaN) { 0L }
    }
}
