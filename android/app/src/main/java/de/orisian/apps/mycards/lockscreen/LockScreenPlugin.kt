package de.orisian.apps.mycards.lockscreen

import android.app.StatusBarManager
import android.content.ComponentName
import android.graphics.drawable.Icon
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import de.orisian.apps.mycards.R

/** Asks Android to add the lock-screen tile to Quick Settings (ADR-0006). */
@CapacitorPlugin(name = "LockScreen")
class LockScreenPlugin : Plugin() {
    @PluginMethod
    fun requestAddTile(call: PluginCall) {
        val statusBar = context.getSystemService(StatusBarManager::class.java)
        statusBar.requestAddTileService(
            ComponentName(context, LockScreenTileService::class.java),
            context.getString(R.string.lock_screen_tile_label),
            Icon.createWithResource(context, R.drawable.ic_lock_screen_tile),
            context.mainExecutor,
        ) { code ->
            val result = when (code) {
                StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ADDED -> "added"
                StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ALREADY_ADDED -> "alreadyAdded"
                StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_NOT_ADDED -> "notAdded"
                else -> "failed"
            }
            call.resolve(JSObject().put("result", result))
        }
    }
}
