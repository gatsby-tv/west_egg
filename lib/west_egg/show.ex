defmodule WestEgg.Show do
  defmodule Profile do
    defstruct [:id, :handle, :display, :since]

    use WestEgg.Parameters
    import WestEgg.Query

    query :insert, """
    INSERT INTO shows.profiles (id, handle, display, since)
    VALUES (:id, :handle, :display, toUnixTimestamp(now()))
    """

    query :select, """
    SELECT * FROM shows.profiles
    WHERE id = :id
    """

    query :update, """
    UPDATE shows.profiles
    SET handle = :handle,
        display = :display
    WHERE id = :id
    """

    query :delete, """
    DELETE FROM shows.profiles
    WHERE id = :id
    """
  end

  defmodule Statistics do
    defstruct [:id, owners: 0, videos: 0]

    use WestEgg.Parameters
    import WestEgg.Query

    query :increment, """
    UPDATE shows.statistics
    SET owners = owners + :owners,
        videos = videos + :videos
    WHERE id = :id
    """

    query :decrement, """
    UPDATE shows.statistics
    SET owners = owners - :owners,
        videos = videos - :videos
    WHERE id = :id
    """
  end

  defmodule Owner do
    defstruct [:id, :owner, :since]

    use WestEgg.Parameters
    use WestEgg.Paging, method: &WestEgg.Show.owners/3
    import WestEgg.Query

    query :insert, """
    INSERT INTO shows.owners (id, owner, since)
    VALUES (:id, :owner, toUnixTimestamp(now()))
    """

    query :select, """
    SELECT * FROM shows.owners
    WHERE id = :id
    """

    query :select_one, """
    SELECT * FROM shows.owners
    WHERE id = :id
    AND owner = :owner
    """

    query :delete, """
    DELETE FROM shows.owners
    WHERE id = :id
    AND owner = :owner
    """
  end

  defmodule Video do
    defstruct [:id, :video, :since]

    use WestEgg.Parameters
    use WestEgg.Paging, method: &WestEgg.Show.videos/3
    import WestEgg.Query

    query :insert, """
    INSERT INTO shows.videos (id, video, since)
    VALUES (:id, :video, toUnixTimestamp(now()))
    """

    query :select, """
    SELECT * FROM shows.videos
    WHERE id = :id
    """

    query :select_one, """
    SELECT * FROM shows.videos
    WHERE id = :id
    AND video = :video
    """

    query :delete, """
    DELETE FROM shows.videos
    WHERE id = :id
    AND video = :video
    """
  end

  def profile(op, data, opts \\ [])

  def profile(:insert, %Profile{} = profile, _opts) do
    params = Profile.to_params(profile)
    select = Xandra.execute!(:xandra, Profile.query(:select), params)

    case Enum.fetch(select, 0) do
      :error ->
        Xandra.execute!(:xandra, Profile.query(:insert), params)
        :ok

      {:ok, _} ->
        {:error, :exists}
    end
  end

  def profile(:select, %Profile{} = profile, _opts) do
    params = Profile.to_params(profile)
    select = Xandra.execute!(:xandra, Profile.query(:select), params)

    case Enum.fetch(select, 0) do
      {:ok, result} -> {:ok, Profile.from_binary_map(result)}
      :error -> {:error, :not_found}
    end
  end

  def profile(:update, %Profile{} = profile, _opts) do
    params = Profile.to_params(profile)
    select = Xandra.execute!(:xandra, Profile.query(:select), params)

    case Enum.fetch(select, 0) do
      {:ok, current} ->
        Xandra.execute!(:xandra, Profile.query(:update), Map.merge(current, params))
        :ok

      :error ->
        {:error, :not_found}
    end
  end

  def profile(:delete, %Profile{} = profile, _opts) do
    params = Profile.to_params(profile)
    Xandra.execute!(:xandra, Profile.query(:delete), params)
    :ok
  end

  def profile([{:error, _} | _] = batch, _op, _data), do: batch

  def profile(batch, :insert, %Profile{} = profile) do
    params = Profile.to_params(profile)
    select = Xandra.execute!(:xandra, Profile.query(:select), params)

    case Enum.fetch(select, 0) do
      :error ->
        query = &Xandra.Batch.add(&1, Profile.query(:insert), params)
        [{:ok, query} | batch]

      {:ok, _} ->
        [{:error, {:exists, :profile, profile.handle}} | batch]
    end
  end

  def profile(batch, :update, %Profile{} = profile) do
    params = Profile.to_params(profile)
    select = Xandra.execute!(:xandra, Profile.query(:select), params)

    case Enum.fetch(select, 0) do
      {:ok, current} ->
        query = &Xandra.Batch.add(&1, Profile.query(:update), Map.merge(current, params))
        [{:ok, query} | batch]

      :error ->
        [{:error, {:not_found, :profile, profile.handle}} | batch]
    end
  end

  def profile(batch, :delete, %Profile{} = profile) do
    params = Profile.to_params(profile)
    query = &Xandra.Batch.add(&1, Profile.query(:delete), params)
    [{:ok, query} | batch]
  end

  def statistics(op, data, opts \\ [])

  def statistics(:increment, %Statistics{} = statistics, _opts) do
    params = Statistics.to_params(statistics)
    Xandra.execute!(:xandra, Statistics.query(:increment), params)
    :ok
  end

  def statistics(:decrement, %Statistics{} = statistics, _opts) do
    params = Statistics.to_params(statistics)
    Xandra.execute!(:xandra, Statistics.query(:decrement), params)
    :ok
  end

  def statistics([{:error, _} | _] = batch, _op, _data), do: batch

  def statistics(batch, :increment, %Statistics{} = statistics) do
    params = Statistics.to_params(statistics)
    query = &Xandra.Batch.add(&1, Statistics.query(:increment), params)
    [{:ok, query} | batch]
  end

  def statistics(batch, :decrement, %Statistics{} = statistics) do
    params = Statistics.to_params(statistics)
    query = &Xandra.Batch.add(&1, Statistics.query(:decrement), params)
    [{:ok, query} | batch]
  end

  def owners(op, data, opts \\ [])

  def owners(:insert, %Owner{} = owner, _opts) do
    params = Owner.to_params(owner)
    select = Xandra.execute!(:xandra, Owner.query(:select_one), params)

    case Enum.fetch(select, 0) do
      :error ->
        Xandra.execute!(:xandra, Owner.query(:insert), params)
        :ok

      {:ok, _} ->
        {:error, :exists}
    end
  end

  def owners(:select, %Owner{} = owner, opts) do
    params = Owner.to_params(owner)
    result = Xandra.execute!(:xandra, Owner.query(:select), params, opts)
    {:ok, result}
  end

  def owners(:select_one, %Owner{} = owner, _opts) do
    params = Owner.to_params(owner)
    select = Xandra.execute!(:xandra, Owner.query(:select_one), params)

    case Enum.fetch(select, 0) do
      {:ok, result} -> {:ok, Owner.from_binary_map(result)}
      :error -> {:error, :not_found}
    end
  end

  def owners(:delete, %Owner{} = owner, _opts) do
    params = Owner.to_params(owner)
    Xandra.execute!(:xandra, Owner.query(:delete), params)
    :ok
  end

  def owners([{:error, _} | _] = batch, _op, _data), do: batch

  def owners(batch, :insert, %Owner{} = owner) do
    params = Owner.to_params(owner)
    select = Xandra.execute!(:xandra, Owner.query(:select_one), params)

    case Enum.fetch(select, 0) do
      :error ->
        query = &Xandra.Batch.add(&1, Owner.query(:insert), params)
        [{:ok, query} | batch]

      {:ok, _} ->
        [{:error, {:exists, :owner, nil}} | batch]
    end
  end

  def owners(batch, :delete, %Owner{} = owner) do
    params = Owner.to_params(owner)
    query = &Xandra.Batch.add(&1, Owner.query(:delete), params)
    [{:ok, query} | batch]
  end

  def videos(op, data, opts \\ [])

  def videos(:insert, %Video{} = video, _opts) do
    params = Video.to_params(video)
    select = Xandra.execute!(:xandra, Video.query(:select_one), params)

    case Enum.fetch(select, 0) do
      :error ->
        Xandra.execute!(:xandra, Video.query(:insert), params)
        :ok

      {:ok, _} ->
        {:error, :exists}
    end
  end

  def videos(:select, %Video{} = video, opts) do
    params = Video.to_params(video)
    result = Xandra.execute!(:xandra, Video.query(:select), params, opts)
    {:ok, result}
  end

  def videos(:select_one, %Video{} = video, _opts) do
    params = Video.to_params(video)
    select = Xandra.execute!(:xandra, Video.query(:select_one), params)

    case Enum.fetch(select, 0) do
      {:ok, result} -> {:ok, Video.from_binary_map(result)}
      :error -> {:error, :not_found}
    end
  end

  def videos(:delete, %Video{} = video, _opts) do
    params = Video.to_params(video)
    Xandra.execute!(:xandra, Video.query(:delete), params)
    :ok
  end

  def videos([{:error, _} | _] = batch, _op, _data), do: batch

  def videos(batch, :insert, %Video{} = video) do
    params = Video.to_params(video)
    select = Xandra.execute!(:xandra, Video.query(:select_one), params)

    case Enum.fetch(select, 0) do
      :error ->
        query = &Xandra.Batch.add(&1, Video.query(:insert), params)
        [{:ok, query} | batch]

      {:ok, _} ->
        [{:error, {:exists, :video, nil}} | batch]
    end
  end

  def videos(batch, :delete, %Video{} = video) do
    params = Video.to_params(video)
    query = &Xandra.Batch.add(&1, Video.query(:delete), params)
    [{:ok, query} | batch]
  end
end