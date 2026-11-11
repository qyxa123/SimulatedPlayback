package com.simplay.core

/** Clock-based progress; reads have no side effects and no recurring tasks or disk writes. */
internal class SimulatedTimeline(
    positionMs: Long,
    val durationMs: Long,
    private val speed: Double,
    private val now: () -> Long
) {
    private var anchorPositionMs = positionMs.coerceIn(0L, durationMs)
    private var anchorTimeMs = now()

    init {
        require(durationMs > 0)
        require(speed.isFinite() && speed > 0)
    }

    fun positionMs(): Long {
        val elapsed = (now() - anchorTimeMs).coerceAtLeast(0L)
        return (anchorPositionMs.toDouble() + elapsed * speed).toLong().coerceIn(0L, durationMs)
    }

    fun seek(positionMs: Long) {
        anchorPositionMs = positionMs.coerceIn(0L, durationMs)
        anchorTimeMs = now()
    }
}
