package de.orisian.apps.mycards.lockscreen

import android.graphics.BitmapFactory
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.graphics.drawable.toDrawable
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.recyclerview.widget.RecyclerView
import androidx.viewpager2.widget.ViewPager2
import de.orisian.apps.mycards.R

/**
 * Shows the cards marked "show on lock screen" over the lock screen (F-08, ADR-0006): name,
 * barcode and number, one card per page, at full brightness. Nothing else of the app is reachable.
 */
class LockScreenActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_lock_screen)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.attributes = window.attributes.apply {
            screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_FULL
        }
        val root = findViewById<View>(R.id.lock_screen_root)
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsetsCompat.CONSUMED
        }

        val cards = LockScreenCards.load(filesDir)
        val pager = findViewById<ViewPager2>(R.id.lock_screen_pager)
        val position = findViewById<TextView>(R.id.lock_screen_position)
        findViewById<View>(R.id.lock_screen_empty).visibility = if (cards.isEmpty()) View.VISIBLE else View.GONE
        pager.adapter = CardAdapter(cards)
        pager.registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
            override fun onPageSelected(page: Int) {
                position.text = getString(R.string.lock_screen_position, page + 1, cards.size)
            }
        })
        position.visibility = if (cards.size > 1) View.VISIBLE else View.GONE
    }

    /** Leaves nothing behind: turning the screen off or switching away closes the screen. */
    override fun onStop() {
        super.onStop()
        finish()
    }

    private class CardAdapter(private val cards: List<LockScreenCard>) : RecyclerView.Adapter<CardHolder>() {
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = CardHolder(
            LayoutInflater.from(parent.context).inflate(R.layout.item_lock_screen_card, parent, false),
        )

        override fun onBindViewHolder(holder: CardHolder, position: Int) = holder.bind(cards[position])

        override fun getItemCount() = cards.size
    }

    private class CardHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val name = view.findViewById<TextView>(R.id.card_name)
        private val barcode = view.findViewById<ImageView>(R.id.card_barcode)
        private val number = view.findViewById<TextView>(R.id.card_number)

        fun bind(card: LockScreenCard) {
            name.text = card.storeName
            number.text = card.cardId
            val bitmap = card.image?.let { BitmapFactory.decodeFile(it.path) }
            barcode.visibility = if (bitmap != null) View.VISIBLE else View.GONE
            // Scaled up without smoothing, so the bars stay sharp for scanners.
            barcode.setImageDrawable(
                bitmap?.toDrawable(itemView.resources)?.apply { isFilterBitmap = false },
            )
        }
    }
}
