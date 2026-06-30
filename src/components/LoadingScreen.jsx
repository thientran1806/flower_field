import { useProgress } from '@react-three/drei'
import '../style.scss'

export default function LoadingScreen() {
    const { progress, active } = useProgress()

    return (
        <div className={`loading-screen ${active ? '' : 'loading-screen--hidden'}`}>
            <div className="loading-screen__content">
                <div className="loading-screen__bloom" />
                <h1 className="loading-screen__title">flower field</h1>
                <div className="loading-screen__bar-track">
                    <div
                        className="loading-screen__bar-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="loading-screen__percent">{Math.round(progress)}%</p>
            </div>
        </div>
    )
}