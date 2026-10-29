// 레이스 소리: 엔진·물살·라이벌·효과음을 소리 파일 없이 실시간 합성한다 (코어 yp::RaceSynth).
// 녹음 소리로 바꾸려면 docs/boat-sound-prompts.md의 파일을 임포트해 별도 오디오 컴포넌트로 재생하면 된다.
#pragma once

#include "Components/SynthComponent.h"
#include "CoreMinimal.h"
#include "YPSynth.h"
#include "YPRaceSynthComponent.generated.h"

UCLASS(ClassGroup = Synth, meta = (BlueprintSpawnableComponent))
class YACHTPARADISE_API UYPRaceSynthComponent : public USynthComponent
{
	GENERATED_BODY()

public:
	UYPRaceSynthComponent(const FObjectInitializer& ObjectInitializer);

	// 게임 스레드에서 매 프레임 호출
	void SetFrame(double SpeedFrac, bool bThrottle, bool bAirborne, bool bBoosting, double RivalProx, double RivalDoppler,
		double RivalSpeedFrac);
	void Trigger(const yp::SfxEvent& Event);
	void Splash(double Impact);
	void SetMutedState(bool bMuted);

protected:
	virtual bool Init(int32& SampleRate) override;
	virtual int32 OnGenerateAudio(float* OutAudio, int32 NumSamples) override;

private:
	TUniquePtr<yp::RaceSynth> Synth;
	bool bMutedState = false;
};
