package de.orisian.apps.mycards.lockscreen

import org.json.JSONObject
import java.io.File

/** A card written by the app to `files/lockscreen/cards.json` (capacitor-lock-screen.ts). */
data class LockScreenCard(val storeName: String, val cardId: String, val image: File?)

object LockScreenCards {
    /** The cards in display order; empty if the app hasn't written any or the file is unreadable. */
    fun load(filesDir: File): List<LockScreenCard> {
        val dir = File(filesDir, "lockscreen")
        return try {
            val cards = JSONObject(File(dir, "cards.json").readText()).getJSONArray("cards")
            (0 until cards.length()).map { i ->
                val card = cards.getJSONObject(i)
                val image = card.optString("image").takeIf { it.isNotEmpty() }?.let { File(dir, File(it).name) }
                LockScreenCard(card.getString("storeName"), card.getString("cardId"), image?.takeIf { it.isFile })
            }
        } catch (e: Exception) {
            emptyList()
        }
    }
}
